/**
 * Phân tích telemetry cho 1 người chơi trong 1 trận (chạy trong Web Worker):
 * độ chính xác theo súng / ống ngắm, bộ phụ kiện hay dùng, vật phẩm ném, kill & bị hạ bởi người hay bot.
 *
 * - Mỗi viên đạn = 1 LogPlayerAttack (có phụ kiện đang gắn); mỗi phát trúng (LogPlayerTakeDamage) mang attackId
 *   của viên đó → độ chính xác = số viên trúng địch ÷ số viên bắn (shotgun nhiều mảnh trúng vẫn tính 1).
 * - Knock / kill có danh sách phụ kiện của súng đã dùng (damageCauserAdditionalInfo / killerDamageInfo.additionalInfo).
 */
import { NO_SCOPE, throwKindOf, type ThrowKind } from "../attachments";
import type { Count } from "./types";

type Ev = { _T: string; _D: string } & Record<string, any>;
interface Char {
  accountId: string;
  teamId: number;
  type?: string;
}

export interface WeaponAccuracy {
  shots: number;
  /** Số viên trúng đối thủ (không tính đồng đội, xe) */
  hits: number;
  /** … trong đó trúng đầu */
  headHits: number;
}

export interface ScopeStat {
  shots: number;
  hits: number;
  knocks: number;
  kills: number;
}

export interface PlayerMatchStats {
  /** Theo itemId súng */
  weapons: Record<string, WeaponAccuracy>;
  /** Theo itemId ống ngắm, NO_SCOPE = không gắn */
  scopes: Record<string, ScopeStat>;
  /** Súng → phụ kiện → số viên bắn khi đang gắn phụ kiện đó */
  loadout: Record<string, Record<string, number>>;
  throws: Partial<Record<ThrowKind, number>>;
  /** Sát thương / knock / kill bằng lựu đạn, molotov, bom dính, C4… */
  throwDamage: number;
  throwKnocks: number;
  throwKills: number;
  /** Số lần cứu đồng đội, và số lần chính mình thả khói ngay trước đó */
  revives: number;
  smokeRevives: number;
  kills: Count;
  knocks: Count;
  /** Số lần bị hạ (chết) bởi người / bot / môi trường (bo, ngã, xe…) */
  deaths: { human: number; bot: number; env: number };
}

const THROW_DAMAGE = new Set([
  "Damage_Explosion_Grenade",
  "Damage_Molotov",
  "Damage_Explosion_StickyBomb",
  "Damage_Explosion_C4",
  "Damage_BlueZoneGrenade",
]);
const SMOKE_BEFORE_REVIVE = 20;
const isBot = (c?: Char | null) => !!c?.accountId?.startsWith("ai.");
const scopeIn = (attachments?: string[]) => attachments?.find((a) => a.includes("_Upper_")) ?? NO_SCOPE;

export function analyzePlayerTelemetry(events: Ev[], playerId: string): PlayerMatchStats {
  const s: PlayerMatchStats = {
    weapons: {},
    scopes: {},
    loadout: {},
    throws: {},
    throwDamage: 0,
    throwKnocks: 0,
    throwKills: 0,
    revives: 0,
    smokeRevives: 0,
    kills: { human: 0, bot: 0 },
    knocks: { human: 0, bot: 0 },
    deaths: { human: 0, bot: 0, env: 0 },
  };
  const startEv = events.find((e) => e._T === "LogMatchStart") ?? events[0];
  const t0 = startEv ? Date.parse(startEv._D) : 0;
  const tOf = (e: Ev) => (Date.parse(e._D) - t0) / 1000;

  // Đội của người chơi (để không tính bắn trúng đồng đội)
  let myTeam: number | null = null;
  for (const e of events) {
    const c = (e.character ?? e.attacker) as Char | undefined;
    if (c?.accountId === playerId) {
      myTeam = c.teamId;
      break;
    }
  }
  const isEnemy = (c?: Char | null): c is Char => !!c?.accountId && c.accountId !== playerId && c.teamId !== myTeam && c.type !== "monster";
  const scope = (id: string) => (s.scopes[id] ??= { shots: 0, hits: 0, knocks: 0, kills: 0 });

  /** attackId → súng + ống ngắm của viên đạn */
  const shots = new Map<number, { weapon: string; scope: string }>();
  const hitIds = new Set<number>();
  const smokes: number[] = [];

  for (const e of events) {
    switch (e._T) {
      case "LogPlayerAttack": {
        const w = e.weapon as { itemId?: string; category?: string; subCategory?: string; attachedItems?: string[] } | undefined;
        if ((e.attacker as Char | null)?.accountId !== playerId || e.attackType !== "Weapon" || !w?.itemId) break;
        if (w.category !== "Weapon" || (w.subCategory !== "Main" && w.subCategory !== "Handgun")) break;
        const sc = scopeIn(w.attachedItems);
        shots.set(e.attackId, { weapon: w.itemId, scope: sc });
        (s.weapons[w.itemId] ??= { shots: 0, hits: 0, headHits: 0 }).shots++;
        scope(sc).shots++;
        const lo = (s.loadout[w.itemId] ??= {});
        for (const a of w.attachedItems ?? []) lo[a] = (lo[a] ?? 0) + 1;
        break;
      }

      case "LogPlayerTakeDamage": {
        const a = e.attacker as Char | null;
        const v = e.victim as Char | null;
        if (a?.accountId !== playerId || !isEnemy(v) || !(Number(e.damage) > 0)) break;
        if (THROW_DAMAGE.has(e.damageTypeCategory)) {
          s.throwDamage += Number(e.damage);
          break;
        }
        const shot = shots.get(e.attackId);
        if (e.damageTypeCategory !== "Damage_Gun" || !shot || hitIds.has(e.attackId)) break;
        hitIds.add(e.attackId);
        const w = s.weapons[shot.weapon];
        w.hits++;
        if (e.damageReason === "HeadShot") w.headHits++;
        scope(shot.scope).hits++;
        break;
      }

      case "LogPlayerMakeGroggy": {
        const a = e.attacker as Char | null;
        const v = e.victim as Char | null;
        if (a?.accountId !== playerId || !isEnemy(v)) break;
        if (isBot(v)) s.knocks.bot++;
        else s.knocks.human++;
        if (e.damageTypeCategory === "Damage_Gun") scope(scopeIn(e.damageCauserAdditionalInfo)).knocks++;
        else if (THROW_DAMAGE.has(e.damageTypeCategory)) s.throwKnocks++;
        break;
      }

      case "LogPlayerKillV2": {
        const v = e.victim as Char | null;
        const killer = (e.killer ?? e.finisher ?? null) as Char | null;
        if (killer?.accountId === playerId && isEnemy(v) && !e.isSuicide) {
          if (isBot(v)) s.kills.bot++;
          else s.kills.human++;
          const info = e.killerDamageInfo ?? e.finishDamageInfo ?? {};
          if (info.damageTypeCategory === "Damage_Gun") scope(scopeIn(info.additionalInfo)).kills++;
          else if (THROW_DAMAGE.has(info.damageTypeCategory)) s.throwKills++;
        }
        if (v?.accountId === playerId) {
          const by = killer ?? (e.dBNOMaker as Char | null);
          if (by && by.accountId !== playerId && by.teamId !== myTeam) {
            if (isBot(by)) s.deaths.bot++;
            else s.deaths.human++;
          } else s.deaths.env++;
        }
        break;
      }

      case "LogPlayerUseThrowable": {
        if ((e.attacker as Char | null)?.accountId !== playerId) break;
        const kind = throwKindOf(e.weapon?.itemId);
        s.throws[kind] = (s.throws[kind] ?? 0) + 1;
        if (kind === "smoke") smokes.push(tOf(e));
        break;
      }

      case "LogPlayerRevive": {
        const r = e.reviver as Char | null;
        const v = e.victim as Char | null;
        if (r?.accountId !== playerId || !v || v.accountId === playerId) break;
        s.revives++;
        const t = tOf(e);
        if (smokes.some((x) => x <= t && t - x <= SMOKE_BEFORE_REVIVE)) s.smokeRevives++;
        break;
      }
    }
  }
  s.throwDamage = Math.round(s.throwDamage);
  return s;
}
