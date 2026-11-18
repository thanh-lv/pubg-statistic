import damageCauserName from "@/data/damageCauserName.json";
import damageTypeCategory from "@/data/damageTypeCategory.json";
import { mapSizeOf } from "../maps";
import type { Actor, Circle, Count, FeedEvent, Hit, MemberAnalysis, Pt, TelemetryAnalysis, ZoneState } from "./types";

/* Kiểu tối giản của các sự kiện telemetry cần dùng */
interface Loc {
  x: number;
  y: number;
}
interface Character {
  name: string;
  teamId: number;
  accountId: string;
  location?: Loc;
}
interface DamageInfo {
  damageReason?: string;
  damageTypeCategory?: string;
  damageCauserName?: string;
  distance?: number;
}
type Ev = { _T: string; _D: string } & Record<string, any>;

const WEAPONS = damageCauserName as Record<string, string>;
const CATEGORIES = damageTypeCategory as Record<string, string>;

/** Nguyên nhân chết không do người/bot */
const ENV_DEATH: Record<string, string> = {
  Damage_BlueZone: "Bo xanh",
  Damage_BlueZoneGrenade: "Lựu đạn bo",
  Damage_RedZone: "Vùng đỏ",
  Damage_BlackZone: "Vùng đen",
  Damage_Drown: "Đuối nước",
  Damage_Fall: "Ngã",
  Damage_Instant_Fall: "Rơi khỏi bản đồ",
  Damage_VehicleCrashHit: "Tai nạn xe",
  Damage_VehicleHit: "Bị xe tông",
};

export const isBotId = (id: string | null | undefined) => !!id && id.startsWith("ai.");

const weaponName = (info?: DamageInfo) => {
  const raw = info?.damageCauserName ?? "";
  return WEAPONS[raw] ?? (raw ? raw.replace(/^Weap|_C$/g, "") : (CATEGORIES[info?.damageTypeCategory ?? ""] ?? "?"));
};

export function analyzeTelemetry(
  events: Ev[],
  team: { id: string; name: string }[],
  mapName: string,
): TelemetryAnalysis {
  const memberIds = team.map((m) => m.id);
  const size = mapSizeOf(mapName);
  const norm = (l?: Loc | null) => (l ? { x: l.x / size, y: l.y / size } : null);
  const members = new Set(memberIds);

  const startEv = events.find((e) => e._T === "LogMatchStart") ?? events[0];
  const t0 = startEv ? Date.parse(startEv._D) : 0;
  const tOf = (e: Ev) => Math.max(0, (Date.parse(e._D) - t0) / 1000);

  const byId = new Map<string, MemberAnalysis>();
  const ensure = (c: Character) => {
    let m = byId.get(c.accountId);
    if (!m) {
      const zero = (): Count => ({ human: 0, bot: 0 });
      m = { id: c.accountId, name: c.name, kills: zero(), knocks: zero(), damage: zero(), death: null, landing: null, path: [] };
      byId.set(c.accountId, m);
    }
    return m;
  };
  const bump = (c: Count, bot: boolean, n = 1) => (bot ? (c.bot += n) : (c.human += n));
  for (const m of team) ensure({ accountId: m.id, name: m.name, teamId: -1 });

  const feed: FeedEvent[] = [];
  const zones: ZoneState[] = [];
  const rawPaths = new Map<string, Pt[]>();
  const actors = new Map<string, Actor>();
  const hits: Hit[] = [];
  let duration = 0;

  const actorOf = (c: Character) => {
    let a = actors.get(c.accountId);
    if (!a) {
      a = { id: c.accountId, name: c.name, teamId: c.teamId, isBot: isBotId(c.accountId), isTeam: members.has(c.accountId), track: [], deathT: null };
      actors.set(c.accountId, a);
    }
    return a;
  };

  for (const e of events) {
    const t = tOf(e);
    if (t > duration) duration = t;

    switch (e._T) {
      case "LogParachuteLanding": {
        const c = e.character as Character | undefined;
        if (c && members.has(c.accountId) && c.location) {
          const p = norm(c.location)!;
          ensure(c).landing ??= { t, ...p };
        }
        break;
      }

      case "LogPlayerPosition": {
        const c = e.character as Character | undefined;
        if (c?.location && c.accountId) {
          const p = norm(c.location)!;
          actorOf(c).track.push(Math.round(t * 10) / 10, p.x, p.y);
        }
        if (c && members.has(c.accountId) && c.location) {
          ensure(c);
          const list = rawPaths.get(c.accountId) ?? [];
          list.push({ t, ...norm(c.location)! });
          rawPaths.set(c.accountId, list);
        }
        break;
      }

      case "LogPlayerTakeDamage": {
        const a = e.attacker as Character | null;
        const v = e.victim as Character | null;
        const dmg = Number(e.damage) || 0;
        // Đường đạn: mọi phát trúng có người bắn (bỏ tự gây sát thương, bo, ngã…)
        if (a?.location && v?.location && a.accountId && a.accountId !== v.accountId && dmg > 0) {
          const pa = norm(a.location)!;
          const pv = norm(v.location)!;
          actorOf(a);
          actorOf(v);
          hits.push({ t, attackerId: a.accountId, victimId: v.accountId, ax: pa.x, ay: pa.y, vx: pv.x, vy: pv.y, damage: dmg });
        }
        if (!a || !v || !members.has(a.accountId)) break;
        if (a.accountId === v.accountId || a.teamId === v.teamId) break;
        if (dmg > 0) bump(ensure(a).damage, isBotId(v.accountId), dmg);
        break;
      }

      case "LogPlayerMakeGroggy": {
        const a = e.attacker as Character | null;
        const v = e.victim as Character | null;
        if (!a || !v || !members.has(a.accountId) || a.teamId === v.teamId) break;
        const bot = isBotId(v.accountId);
        const m = ensure(a);
        bump(m.knocks, bot);
        feed.push({
          t,
          kind: "knock",
          memberId: a.accountId,
          memberName: a.name,
          otherId: v.accountId,
          otherName: v.name,
          otherIsBot: bot,
          weapon: weaponName({ damageCauserName: e.damageCauserName, damageTypeCategory: e.damageTypeCategory }),
          distance: (Number(e.distance) || 0) / 100,
          headshot: e.damageReason === "HeadShot",
          pos: norm(v.location),
        });
        break;
      }

      case "LogPlayerKillV2":
      case "LogPlayerKill": {
        const v = e.victim as Character | null;
        const killer = (e.killer ?? null) as Character | null;
        const info: DamageInfo =
          e._T === "LogPlayerKillV2"
            ? (e.killerDamageInfo ?? e.finishDamageInfo ?? e.dBNODamageInfo ?? {})
            : { damageCauserName: e.damageCauserName, damageTypeCategory: e.damageTypeCategory, damageReason: e.damageReason, distance: e.distance };
        if (!v) break;
        if (v.accountId) actorOf(v).deathT ??= t;

        // Thành viên đội kill được đối thủ
        if (killer && members.has(killer.accountId) && killer.teamId !== v.teamId && !e.isSuicide) {
          const bot = isBotId(v.accountId);
          bump(ensure(killer).kills, bot);
          feed.push({
            t,
            kind: "kill",
            memberId: killer.accountId,
            memberName: killer.name,
            otherId: v.accountId,
            otherName: v.name,
            otherIsBot: bot,
            weapon: weaponName(info),
            distance: (Number(info.distance) || 0) / 100,
            headshot: info.damageReason === "HeadShot",
            pos: norm(v.location),
          });
        }

        // Thành viên đội bị hạ
        if (members.has(v.accountId)) {
          const m = ensure(v);
          const envCause = ENV_DEATH[info.damageTypeCategory ?? ""];
          const byEnemy = killer && killer.accountId !== v.accountId;
          const ev: FeedEvent = {
            t,
            kind: "death",
            memberId: v.accountId,
            memberName: v.name,
            otherId: byEnemy ? killer!.accountId : null,
            otherName: byEnemy ? killer!.name : (envCause ?? (e.isSuicide ? "Tự sát" : "Không rõ")),
            otherIsBot: byEnemy ? isBotId(killer!.accountId) : false,
            weapon: byEnemy ? weaponName(info) : "",
            distance: byEnemy ? (Number(info.distance) || 0) / 100 : 0,
            headshot: info.damageReason === "HeadShot",
            pos: norm(v.location),
          };
          m.death ??= ev;
          feed.push(ev);
        }
        break;
      }

      case "LogGameStatePeriodic": {
        const g = e.gameState ?? {};
        const circle = (p?: Loc, r?: number): Circle | null =>
          p && r ? { x: p.x / size, y: p.y / size, r: r / size } : null;
        zones.push({
          t,
          blue: circle(g.safetyZonePosition, g.safetyZoneRadius),
          white: circle(g.poisonGasWarningPosition, g.poisonGasWarningRadius),
        });
        break;
      }
    }
  }

  // Đường đi: bắt đầu từ lúc tiếp đất (bỏ đoạn trên máy bay / dù)
  for (const [id, pts] of rawPaths) {
    const m = byId.get(id)!;
    const from = m.landing?.t ?? 0;
    const after = pts.filter((p) => p.t >= from);
    const end = m.death?.t ?? Infinity;
    m.path = [...(m.landing ? [m.landing] : []), ...after.filter((p) => p.t <= end)];
    if (m.death?.pos) m.path.push({ t: m.death.t, ...m.death.pos });
  }

  const ordered = memberIds.map((id) => byId.get(id)).filter((m): m is MemberAnalysis => !!m);
  return {
    duration,
    members: ordered,
    events: feed.sort((a, b) => a.t - b.t),
    zones,
    actors: [...actors.values()],
    hits: hits.sort((a, b) => a.t - b.t),
  };
}
