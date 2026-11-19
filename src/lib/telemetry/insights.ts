/**
 * Chỉ số giúp đội cải thiện, tính từ telemetry (chạy trong Web Worker cùng analyzeTelemetry).
 * Phase 1 — Phối hợp đội: trả đòn, cứu đồng đội, khoảng cách đội.
 * Phase 2 — Giao tranh: trận đánh theo đội địch, ai bắn trước, sát thương gây/nhận theo tầm, knock → kill.
 * Phase 3 — Bo & di chuyển: vào bo sớm/muộn, sát thương bo, thời gian ngoài bo, chết ở bo mấy, đi xe.
 * Phase 4 — Loot & vật phẩm: tốc độ có súng / giáp / mũ, lựu đạn & smoke, cứu người có smoke.
 */
import { posAt } from "./track";
import type {
  Actor,
  Combat,
  Count,
  Fight,
  Loot,
  MemberAnalysis,
  MemberLoot,
  MemberRotation,
  RangeBucket,
  Rotation,
  Setback,
  TeamInsights,
  Teamplay,
  Throwables,
  ZonePhase,
  ZoneState,
} from "./types";

type Ev = { _T: string; _D: string } & Record<string, any>;
interface Char {
  name: string;
  teamId: number;
  accountId: string;
  location?: { x: number; y: number; z?: number };
  isInVehicle?: boolean;
  isInBlueZone?: boolean;
  /** "user" | "user_ai" | "monster" */
  type?: string;
}

/** Trả đòn = knock/kill lại đội địch trong vòng bao nhiêu giây */
export const TRADE_WINDOW = 10;
/** Cách đồng đội gần nhất quá mức này (m) coi là "đi lẻ" */
export const ISOLATED_M = 150;
/** Bị đội khác đánh trong vòng bao nhiêu giây sau khi vừa đọ súng với 1 đội → bên thứ ba */
const THIRD_PARTY_WINDOW = 20;
/** Bước lấy mẫu khoảng cách đội (s) — khớp chu kỳ LogPlayerPosition */
const SPREAD_STEP = 10;

export interface InsightInput {
  events: Ev[];
  tOf: (e: Ev) => number;
  members: MemberAnalysis[];
  actors: Map<string, Actor>;
  /** Kích thước bản đồ (cm) — toạ độ chuẩn hoá × size / 100 = mét */
  size: number;
  duration: number;
  /** Tên nguyên nhân khi không có người gây (bo, ngã, xe…) */
  envName: (damageTypeCategory?: string) => string;
  /** Trạng thái bo theo thời gian (toạ độ chuẩn hoá) */
  zones: ZoneState[];
}

export function computeInsights(input: InsightInput): TeamInsights {
  const ctx = makeCtx(input);
  return {
    teamSize: input.members.length,
    teamplay: teamplay(input, ctx),
    combat: combat(input, ctx),
    rotation: rotation(input, ctx),
    loot: loot(input, ctx),
  };
}

type Ctx = ReturnType<typeof makeCtx>;

function makeCtx({ events, tOf, members, actors, size }: InsightInput) {
  const memberIds = new Set(members.map((m) => m.id));
  const myTeamId = members.map((m) => actors.get(m.id)?.teamId).find((x) => x != null) ?? null;

  // Khoảng thời gian đã chết của từng thành viên. Một số bản đồ có hồi sinh (recall):
  // chết rồi được tạo lại (LogPlayerCreate) và nhảy dù lần nữa.
  const deadSpans = new Map<string, [number, number][]>(members.map((m) => [m.id, []]));
  for (const e of events) {
    if (e._T === "LogPlayerKillV2" || e._T === "LogPlayerKill") {
      const spans = deadSpans.get(e.victim?.accountId);
      if (spans && !(spans.at(-1)?.[1] === Infinity)) spans.push([tOf(e), Infinity]);
    } else if (e._T === "LogPlayerCreate") {
      const last = deadSpans.get(e.character?.accountId)?.at(-1);
      if (last && last[1] === Infinity) last[1] = tOf(e);
    }
  }

  return {
    /** Thành viên còn sống (chưa chết, hoặc đã được hồi sinh) tại thời điểm t */
    aliveAt: (id: string, t: number) => !(deadSpans.get(id) ?? []).some(([a, b]) => t >= a && t < b),
    /** Lần chết cuối cùng (không được hồi sinh); null = sống tới cuối */
    finalDeath: (id: string) => {
      const last = deadSpans.get(id)?.at(-1);
      return last && last[1] === Infinity ? last[0] : null;
    },
    /** Số lần được hồi sinh */
    recalls: (id: string) => (deadSpans.get(id) ?? []).filter(([, b]) => b !== Infinity).length,
    // NPC sự kiện (type "monster", vd ChickenMan) không phải đối thủ
    isEnemy: (c?: Char | null): boolean =>
      !!c?.accountId && !memberIds.has(c.accountId) && c.teamId !== myTeamId && c.type !== "monster",
    isMember: (c?: Char | null): boolean => !!c?.accountId && memberIds.has(c.accountId),
    /** Toạ độ thế giới (cm) → chuẩn hoá 0..1 */
    norm: (l: { x: number; y: number }) => ({ x: l.x / size, y: l.y / size }),
    /** Khoảng cách (m) giữa 2 điểm toạ độ chuẩn hoá */
    meters: (a: { x: number; y: number }, b: { x: number; y: number }) => (Math.hypot(a.x - b.x, a.y - b.y) * size) / 100,
    /** Khoảng cách (m) giữa 2 nhân vật theo toạ độ thế giới (cm), có tính độ cao */
    charMeters: (a: Char, b: Char) =>
      a.location && b.location
        ? Math.hypot(a.location.x - b.location.x, a.location.y - b.location.y, (a.location.z ?? 0) - (b.location.z ?? 0)) / 100
        : null,
    posOf: (id: string, t: number) => {
      const tr = actors.get(id)?.track;
      return tr ? posAt(tr, t, 30) : null;
    },
  };
}

/* ------------------------------ Phase 1 ------------------------------ */

function teamplay({ events, tOf, members, duration, envName }: InsightInput, { isEnemy, isMember, meters, posOf, aliveAt, norm }: Ctx): Teamplay {
  const setbacks: Setback[] = [];
  /** Knock đang chờ: được cứu hoặc mất */
  const pending = new Map<string, Setback>();
  const dead = new Set<string>();
  /** Lần cuối đọ súng giữa đội mình và từng đội địch */
  const lastExchange = new Map<number, number>();
  /** Các lần đội mình knock/kill đối thủ */
  const offense: { t: number; teamId: number }[] = [];

  const standing = (exceptId: string) => members.filter((m) => m.id !== exceptId && !dead.has(m.id) && !pending.has(m.id));

  const addSetback = (t: number, kind: Setback["kind"], v: Char, rawAttacker: Char | null, category?: string) => {
    const attacker = rawAttacker?.accountId && rawAttacker.accountId !== v.accountId && rawAttacker.teamId !== v.teamId ? rawAttacker : null;
    const mates = standing(v.accountId);
    const me = v.location ? norm(v.location) : posOf(v.accountId, t);
    let nearestMate: number | null = null;
    for (const m of mates) {
      const p = posOf(m.id, t);
      if (me && p) nearestMate = Math.min(nearestMate ?? Infinity, meters(me, p));
    }
    const thirdParty =
      !!attacker && [...lastExchange].some(([team, last]) => team !== attacker.teamId && t - last <= THIRD_PARTY_WINDOW);
    const sb: Setback = {
      t,
      memberId: v.accountId,
      memberName: v.name,
      kind,
      attackerId: attacker?.accountId ?? null,
      attackerName: attacker?.name ?? envName(category),
      attackerTeamId: attacker?.teamId ?? null,
      attackerIsBot: !!attacker?.accountId.startsWith("ai."),
      nearestMate: nearestMate == null ? null : Math.round(nearestMate),
      supported: mates.length > 0,
      tradedAt: null,
      outcome: null,
      revivedBy: null,
      thirdParty,
      inVehicle: !!v.isInVehicle,
      pos: me,
    };
    setbacks.push(sb);
    return sb;
  };

  for (const e of events) {
    switch (e._T) {
      case "LogPlayerTakeDamage": {
        const a = e.attacker as Char | null;
        const v = e.victim as Char | null;
        if (!(Number(e.damage) > 0)) break;
        if (isMember(a) && isEnemy(v)) lastExchange.set(v!.teamId, tOf(e));
        else if (isMember(v) && isEnemy(a)) lastExchange.set(a!.teamId, tOf(e));
        break;
      }

      case "LogPlayerMakeGroggy": {
        const a = e.attacker as Char | null;
        const v = e.victim as Char | null;
        const t = tOf(e);
        if (isMember(v)) pending.set(v!.accountId, addSetback(t, "knock", v!, a, e.damageTypeCategory));
        else if (isMember(a) && isEnemy(v)) offense.push({ t, teamId: v!.teamId });
        break;
      }

      case "LogPlayerCreate": {
        // Được hồi sinh (recall) → đứng lại được
        const c = e.character as Char | undefined;
        if (c) dead.delete(c.accountId);
        break;
      }

      case "LogPlayerRevive": {
        const v = e.victim as Char | null;
        const sb = v && pending.get(v.accountId);
        if (sb) {
          sb.outcome = "revived";
          sb.revivedBy = (e.reviver as Char | null)?.name ?? null;
          pending.delete(v.accountId);
        }
        break;
      }

      case "LogPlayerKillV2":
      case "LogPlayerKill": {
        const v = e.victim as Char | null;
        const killer = (e.killer ?? e.finisher ?? e.dBNOMaker ?? null) as Char | null;
        const t = tOf(e);
        if (v && isMember(v)) {
          const sb = pending.get(v.accountId);
          if (sb) {
            sb.outcome = "lost";
            pending.delete(v.accountId);
          } else if (!dead.has(v.accountId)) {
            const info = e.killerDamageInfo ?? e.finishDamageInfo ?? e.dBNODamageInfo ?? e;
            addSetback(t, "death", v, killer, info?.damageTypeCategory);
          }
          dead.add(v.accountId);
        } else if (v && isMember(killer) && isEnemy(v)) {
          offense.push({ t, teamId: v.teamId });
        }
        break;
      }
    }
  }

  // Trả đòn: đội mình knock/kill 1 người của đội vừa gây ra trong TRADE_WINDOW giây
  for (const sb of setbacks) {
    if (sb.attackerTeamId == null || !sb.supported) continue;
    const hit = offense.find((o) => o.teamId === sb.attackerTeamId && o.t > sb.t && o.t <= sb.t + TRADE_WINDOW);
    sb.tradedAt = hit ? hit.t : null;
  }

  // Khoảng cách đội: lấy mẫu sau khi cả đội đã tiếp đất
  const landed = members.map((m) => m.landing?.t).filter((x): x is number => x != null);
  let spreadSum = 0;
  let ticks = 0;
  let isolatedTicks = 0;
  if (members.length > 1 && landed.length) {
    const from = Math.max(...landed);
    for (let t = from; t <= duration; t += SPREAD_STEP) {
      const pts = members
        .filter((m) => aliveAt(m.id, t))
        .map((m) => posOf(m.id, t))
        .filter((p): p is { x: number; y: number } => !!p);
      if (pts.length < 2) continue;
      const nearest = pts.map((p, i) => Math.min(...pts.filter((_, j) => j !== i).map((q) => meters(p, q))));
      spreadSum += nearest.reduce((s, d) => s + d, 0) / nearest.length;
      if (nearest.some((d) => d > ISOLATED_M)) isolatedTicks++;
      ticks++;
    }
  }

  return {
    setbacks,
    spreadAvg: ticks ? Math.round(spreadSum / ticks) : null,
    isolatedPct: ticks ? isolatedTicks / ticks : null,
  };
}

/* ------------------------------ Phase 2 ------------------------------ */

/** Các pha trao đổi với cùng 1 đội cách nhau quá mức này (s) → tính là trận đánh mới */
export const FIGHT_GAP = 30;
/** Tầm giao tranh (m) */
const RANGES: [string, number, number][] = [
  ["0–25 m", 0, 25],
  ["25–100 m", 25, 100],
  ["100–250 m", 100, 250],
  ["> 250 m", 250, Infinity],
];
/** Máu chảy khi đang bị knock — không tính là đọ súng */
const BLEED = "Damage_DBNO";

function combat({ events, tOf, size }: InsightInput, { isEnemy, isMember, charMeters }: Ctx): Combat {
  const fights: (Fight & { anyHuman: boolean })[] = [];
  const open = new Map<number, Fight & { anyHuman: boolean }>();
  const ranges: RangeBucket[] = RANGES.map(([label, min, max]) => ({ label, min, max, dealt: 0, taken: 0, knocks: 0, knocked: 0 }));
  const bucket = (m: number | null) => (m == null ? null : ranges.find((r) => m >= r.min && m < r.max)!);
  const taken: Record<string, Count> = {};
  /** Đối thủ đang bị knock (bởi bất kỳ ai) — để phân biệt kill thẳng với kết liễu */
  const enemyDown = new Set<string>();
  const memberDown = new Set<string>();
  /** Các lần đội mình knock địch → kết cục */
  const ourKnocks = new Map<string, "open" | "finished" | "revived">();
  const conversion = { finished: 0, revived: 0, open: 0 };

  /** Lấy trận đánh đang diễn ra với đội địch (hoặc mở trận mới) */
  const touch = (enemy: Char, t: number, side: Fight["firstHit"], at?: Char | null) => {
    let f = open.get(enemy.teamId);
    if (!f || t - f.end > FIGHT_GAP) {
      f = {
        start: t,
        end: t,
        enemyTeamId: enemy.teamId,
        enemyIsBot: true,
        anyHuman: false,
        firstHit: side,
        dealt: 0,
        taken: 0,
        ourLosses: 0,
        theirLosses: 0,
        result: "even",
        pos: at?.location ? { x: at.location.x / size, y: at.location.y / size } : null,
      };
      open.set(enemy.teamId, f);
      fights.push(f);
    }
    f.end = t;
    if (!enemy.accountId.startsWith("ai.")) f.anyHuman = true;
    return f;
  };

  for (const e of events) {
    switch (e._T) {
      case "LogPlayerTakeDamage": {
        const a = e.attacker as Char | null;
        const v = e.victim as Char | null;
        const dmg = Number(e.damage) || 0;
        if (!a || !v || dmg <= 0 || e.damageTypeCategory === BLEED) break;
        const t = tOf(e);
        if (isMember(a) && isEnemy(v)) {
          touch(v, t, "us", v).dealt += dmg;
          const b = bucket(charMeters(a, v));
          if (b) b.dealt += dmg;
        } else if (isMember(v) && isEnemy(a)) {
          touch(a, t, "them", v).taken += dmg;
          const b = bucket(charMeters(a, v));
          if (b) b.taken += dmg;
          const c = (taken[v.accountId] ??= { human: 0, bot: 0 });
          if (a.accountId.startsWith("ai.")) c.bot += dmg;
          else c.human += dmg;
        }
        break;
      }

      case "LogPlayerMakeGroggy": {
        const a = e.attacker as Char | null;
        const v = e.victim as Char | null;
        if (!v) break;
        const t = tOf(e);
        const dist = Number(e.distance) > 0 ? Number(e.distance) / 100 : a ? charMeters(a, v) : null;
        if (isMember(v)) {
          memberDown.add(v.accountId);
          if (a && isEnemy(a)) {
            touch(a, t, "them", v).ourLosses++;
            const b = bucket(dist);
            if (b) b.knocked++;
          }
        } else {
          enemyDown.add(v.accountId);
          if (isMember(a) && isEnemy(v)) {
            touch(v, t, "us", v).theirLosses++;
            ourKnocks.set(v.accountId, "open");
            const b = bucket(dist);
            if (b) b.knocks++;
          }
        }
        break;
      }

      case "LogPlayerRevive": {
        const v = e.victim as Char | null;
        if (!v) break;
        enemyDown.delete(v.accountId);
        memberDown.delete(v.accountId);
        if (ourKnocks.get(v.accountId) === "open") {
          ourKnocks.delete(v.accountId);
          conversion.revived++;
        }
        break;
      }

      case "LogPlayerKillV2":
      case "LogPlayerKill": {
        const v = e.victim as Char | null;
        const killer = (e.killer ?? e.finisher ?? null) as Char | null;
        if (!v) break;
        const t = tOf(e);
        if (isMember(v)) {
          // Chết thẳng (không qua knock) dưới tay địch = thêm 1 lần bị hạ
          if (!memberDown.has(v.accountId) && killer && isEnemy(killer)) touch(killer, t, "them", v).ourLosses++;
          memberDown.delete(v.accountId);
        } else {
          if (!enemyDown.has(v.accountId) && isMember(killer) && isEnemy(v)) touch(v, t, "us", v).theirLosses++;
          enemyDown.delete(v.accountId);
          if (ourKnocks.get(v.accountId) === "open") {
            ourKnocks.delete(v.accountId);
            conversion.finished++;
          }
        }
        break;
      }
    }
  }
  conversion.open = ourKnocks.size;

  return {
    fights: fights.map(({ anyHuman, ...f }) => ({
      ...f,
      enemyIsBot: !anyHuman,
      dealt: Math.round(f.dealt),
      taken: Math.round(f.taken),
      result: f.theirLosses > f.ourLosses ? "win" : f.theirLosses < f.ourLosses ? "loss" : "even",
    })),
    ranges: ranges.map((r) => ({ ...r, dealt: Math.round(r.dealt), taken: Math.round(r.taken) })),
    knockConversion: conversion,
    taken,
  };
}

/* ------------------------------ Phase 3 ------------------------------ */

/** Vòng trắng nhỏ hơn mức này (tỉ lệ bản đồ) là điểm cuối, bỏ qua */
const MIN_WHITE = 0.002;

/** Chia trận thành các vòng bo: bắt đầu khi vòng trắng mới xuất hiện, khép khi bo xanh chạm vòng trắng */
export function zonePhases(zones: ZoneState[]): { index: number; start: number; close: number | null; white: { x: number; y: number; r: number } }[] {
  const out: { index: number; start: number; close: number | null; white: { x: number; y: number; r: number } }[] = [];
  for (const z of zones) {
    const w = z.white;
    const cur = out.at(-1);
    if (w && w.r > MIN_WHITE && (!cur || Math.abs(w.r - cur.white.r) > cur.white.r * 0.01)) {
      if (cur && cur.close == null) cur.close = z.t; // vòng trắng mới xuất hiện ⇒ vòng trước đã khép
      out.push({ index: out.length + 1, start: z.t, close: null, white: w });
    } else if (cur && cur.close == null && z.blue && z.blue.r <= cur.white.r * 1.01) {
      cur.close = z.t;
    }
  }
  return out;
}

function rotation({ events, tOf, members, actors, duration, zones }: InsightInput, { isMember, aliveAt, finalDeath, recalls }: Ctx): Rotation {
  const phases = zonePhases(zones);
  const per: Record<string, MemberRotation> = Object.fromEntries(
    members.map((m) => [m.id, { blueDamage: 0, outsideSec: 0, deathPhase: null, vehicleSec: 0, recalls: recalls(m.id) }]),
  );
  const lastSample = new Map<string, { t: number; blue: boolean }>();
  const riding = new Map<string, number>();

  for (const e of events) {
    switch (e._T) {
      case "LogPlayerPosition": {
        const c = e.character as Char | undefined;
        if (!c || !isMember(c)) break;
        const t = tOf(e);
        const prev = lastSample.get(c.accountId);
        if (prev?.blue) per[c.accountId].outsideSec += Math.min(t - prev.t, 15);
        lastSample.set(c.accountId, { t, blue: !!c.isInBlueZone });
        break;
      }
      case "LogPlayerTakeDamage": {
        const v = e.victim as Char | null;
        if (v && isMember(v) && e.damageTypeCategory === "Damage_BlueZone") per[v.accountId].blueDamage += Number(e.damage) || 0;
        break;
      }
      case "LogVehicleRide": {
        const c = e.character as Char | undefined;
        if (c && isMember(c) && e.vehicle?.vehicleType !== "TransportAircraft") riding.set(c.accountId, tOf(e));
        break;
      }
      case "LogVehicleLeave":
      case "LogPlayerKillV2": {
        // Rời xe, hoặc chết khi đang ngồi xe
        const c = (e._T === "LogVehicleLeave" ? e.character : e.victim) as Char | undefined;
        const from = c && riding.get(c.accountId);
        if (c && from != null) {
          per[c.accountId].vehicleSec += tOf(e) - from;
          riding.delete(c.accountId);
        }
        break;
      }
    }
  }
  // Còn ngồi xe lúc hết trận
  for (const [id, from] of riding) per[id].vehicleSec += Math.max(0, duration - from);

  const phaseAt = (t: number) => phases.filter((p) => p.start <= t).length;
  for (const m of members) {
    per[m.id].blueDamage = Math.round(per[m.id].blueDamage);
    per[m.id].outsideSec = Math.round(per[m.id].outsideSec);
    per[m.id].vehicleSec = Math.round(per[m.id].vehicleSec);
    const died = finalDeath(m.id);
    per[m.id].deathPhase = died == null ? null : phaseAt(died);
  }

  // Vào bo: lần đầu (từ lúc vòng trắng xuất hiện) đứng trong vòng trắng, so với lúc bo khép
  const result: ZonePhase[] = phases.map((p) => {
    const margins: Record<string, number | null> = {};
    for (const m of members) {
      const track = actors.get(m.id)?.track ?? [];
      // Chỉ tính người còn sống lúc bo khép
      if (p.close == null || !aliveAt(m.id, p.close) || !track.length) {
        margins[m.id] = null;
        continue;
      }
      let entry: number | null = null;
      for (let i = 0; i < track.length; i += 3) {
        const t = track[i];
        if (t < p.start || !aliveAt(m.id, t)) continue;
        if (Math.hypot(track[i + 1] - p.white.x, track[i + 2] - p.white.y) <= p.white.r) {
          entry = t;
          break;
        }
      }
      margins[m.id] = entry == null ? null : Math.round(p.close - entry);
    }
    return { index: p.index, start: Math.round(p.start), close: p.close == null ? null : Math.round(p.close), margins };
  });

  return { phases: result, members: per };
}

/* ------------------------------ Phase 4 ------------------------------ */

/** Sát thương từ vật phẩm ném / nổ do người chơi gây */
const THROW_DAMAGE = new Set([
  "Damage_Explosion_Grenade",
  "Damage_Molotov",
  "Damage_Explosion_StickyBomb",
  "Damage_Explosion_C4",
  "Damage_BlueZoneGrenade",
]);
/** Smoke thả trong vòng bao nhiêu giây trước khi cứu xong thì tính là "cứu có smoke" */
const SMOKE_BEFORE_REVIVE = 20;
const PICKUPS = new Set(["LogItemPickup", "LogItemPickupFromLootBox", "LogItemPickupFromCarepackage"]);

const throwKind = (itemId = ""): keyof Throwables =>
  /SmokeBomb/.test(itemId) ? "smoke" : /Molotov/.test(itemId) ? "molotov" : /FlashBang/.test(itemId) ? "flash" : /_Grenade_C$/.test(itemId) ? "grenade" : "other";
const level = (itemId = "") => Number(/_Lv(\d)/.exec(itemId)?.[1] ?? 0);

function loot({ events, tOf, members }: InsightInput, { isEnemy, isMember }: Ctx): Loot {
  const per: Record<string, MemberLoot> = Object.fromEntries(
    members.map((m) => [
      m.id,
      { firstWeapon: null, armor2: null, helmet2: null, throwables: { grenade: 0, smoke: 0, molotov: 0, flash: 0, other: 0 }, throwDamage: 0 },
    ]),
  );
  const landedAt = new Map(members.filter((m) => m.landing).map((m) => [m.id, m.landing!.t]));
  // Chỉ tính đồ có được sau khi tiếp đất: vài sự kiện phát sẵn vũ khí lúc còn trên máy bay (vd nỏ Cupid)
  const since = (id: string, t: number) => {
    const l = landedAt.get(id);
    return l == null || t < l ? null : Math.round(t - l);
  };
  const smokes: number[] = [];
  let revives = 0;
  let smokeRevives = 0;

  for (const e of events) {
    if (PICKUPS.has(e._T) || e._T === "LogItemEquip") {
      const c = e.character as Char | undefined;
      const item = e.item as { itemId?: string; category?: string; subCategory?: string } | undefined;
      if (!c || !item || !isMember(c)) continue;
      const m = per[c.accountId];
      const t = tOf(e);
      const dt = since(c.accountId, t);
      if (dt == null) continue;
      if (item.category === "Weapon" && item.subCategory === "Main") m.firstWeapon ??= dt;
      if (e._T === "LogItemEquip" && level(item.itemId) >= 2) {
        if (item.subCategory === "Vest") m.armor2 ??= dt;
        if (item.subCategory === "Headgear") m.helmet2 ??= dt;
      }
      continue;
    }
    switch (e._T) {
      case "LogPlayerUseThrowable": {
        const a = e.attacker as Char | null;
        if (!a || !isMember(a)) break;
        const kind = throwKind(e.weapon?.itemId);
        per[a.accountId].throwables[kind]++;
        if (kind === "smoke") smokes.push(tOf(e));
        break;
      }
      case "LogPlayerTakeDamage": {
        const a = e.attacker as Char | null;
        const v = e.victim as Char | null;
        if (a && isMember(a) && isEnemy(v) && THROW_DAMAGE.has(e.damageTypeCategory)) per[a.accountId].throwDamage += Number(e.damage) || 0;
        break;
      }
      case "LogPlayerRevive": {
        const r = e.reviver as Char | null;
        const v = e.victim as Char | null;
        if (!isMember(r) || !isMember(v) || r!.accountId === v!.accountId) break;
        revives++;
        const t = tOf(e);
        if (smokes.some((s) => s <= t && t - s <= SMOKE_BEFORE_REVIVE)) smokeRevives++;
        break;
      }
    }
  }
  for (const m of Object.values(per)) m.throwDamage = Math.round(m.throwDamage);
  return { members: per, revives, smokeRevives };
}

/* ------------------------------ Tổng hợp ------------------------------ */

export interface Ratio {
  n: number;
  of: number;
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** Các con số tóm tắt của Phase 1 (dùng cho UI & cộng dồn nhiều trận) */
export function summarizeTeamplay(tp: Teamplay) {
  const byEnemy = tp.setbacks.filter((s) => s.attackerTeamId != null);
  const tradeable = byEnemy.filter((s) => s.supported);
  const knocks = tp.setbacks.filter((s) => s.kind === "knock" && s.outcome);
  return {
    trade: { n: tradeable.filter((s) => s.tradedAt != null).length, of: tradeable.length } as Ratio,
    revive: { n: knocks.filter((s) => s.outcome === "revived").length, of: knocks.length } as Ratio,
    /** Trung vị khoảng cách tới đồng đội gần nhất lúc bị địch hạ (m) */
    mateDistance: median(byEnemy.map((s) => s.nearestMate).filter((d): d is number => d != null)),
    /** Bị địch hạ khi không còn đồng đội nào đứng */
    alone: byEnemy.filter((s) => !s.supported).length,
    thirdParty: tp.setbacks.filter((s) => s.thirdParty).length,
    spreadAvg: tp.spreadAvg,
    isolatedPct: tp.isolatedPct,
  };
}
export type TeamplaySummary = ReturnType<typeof summarizeTeamplay>;

/** Các con số tóm tắt của Phase 2 */
export function summarizeCombat(c: Combat) {
  const wins = (fs: Fight[]) => fs.filter((f) => f.result === "win").length;
  const vsHuman = c.fights.filter((f) => !f.enemyIsBot);
  const decisiveHuman = vsHuman.filter((f) => f.result !== "even");
  const decisiveBot = c.fights.filter((f) => f.enemyIsBot && f.result !== "even");
  const usFirst = decisiveHuman.filter((f) => f.firstHit === "us");
  const themFirst = decisiveHuman.filter((f) => f.firstHit === "them");
  const sum = (fs: Fight[], k: "dealt" | "taken") => fs.reduce((n, f) => n + f[k], 0);
  return {
    /** Tỉ lệ thắng trận đánh với đội có người thật (chỉ tính trận có người bị hạ) */
    winHuman: { n: wins(decisiveHuman), of: decisiveHuman.length } as Ratio,
    winBot: { n: wins(decisiveBot), of: decisiveBot.length } as Ratio,
    /** Trong các trận đánh với người: tỉ lệ đội mình bắn trúng trước */
    firstHit: { n: vsHuman.filter((f) => f.firstHit === "us").length, of: vsHuman.length } as Ratio,
    winWhenFirst: { n: wins(usFirst), of: usFirst.length } as Ratio,
    winWhenSecond: { n: wins(themFirst), of: themFirst.length } as Ratio,
    dealtHuman: sum(vsHuman, "dealt"),
    takenHuman: sum(vsHuman, "taken"),
    dealt: sum(c.fights, "dealt"),
    taken: sum(c.fights, "taken"),
    /** Knock địch → kết liễu được (không để đồng đội họ cứu) */
    conversion: { n: c.knockConversion.finished, of: c.knockConversion.finished + c.knockConversion.revived } as Ratio,
  };
}
export type CombatSummary = ReturnType<typeof summarizeCombat>;

/** Vào bo sát giờ (giây) */
export const TIGHT_ENTRY = 30;

/** Các con số tóm tắt của Phase 3 */
export function summarizeRotation(r: Rotation, setbacks: Setback[]) {
  const margins = r.phases.flatMap((p) => Object.values(p.margins)).filter((m): m is number => m != null);
  const ms = Object.values(r.members);
  const n = ms.length || 1;
  return {
    /** Lượt vào bo muộn (bo xanh đã tới) */
    late: { n: margins.filter((m) => m < 0).length, of: margins.length } as Ratio,
    /** Lượt vào bo sát giờ (0..TIGHT_ENTRY giây trước khi khép) */
    tight: { n: margins.filter((m) => m >= 0 && m < TIGHT_ENTRY).length, of: margins.length } as Ratio,
    blueDamagePerMember: ms.reduce((s, m) => s + m.blueDamage, 0) / n,
    outsidePerMember: ms.reduce((s, m) => s + m.outsideSec, 0) / n,
    vehiclePerMember: ms.reduce((s, m) => s + m.vehicleSec, 0) / n,
    vehicleSetbacks: setbacks.filter((s) => s.inVehicle).length,
  };
}
export type RotationSummary = ReturnType<typeof summarizeRotation>;

/** Các con số tóm tắt của Phase 4 */
export function summarizeLoot(l: Loot) {
  const ms = Object.values(l.members);
  const n = ms.length || 1;
  const times = (k: "firstWeapon" | "armor2" | "helmet2") => ms.map((m) => m[k]).filter((x): x is number => x != null);
  const thrown = ms.reduce(
    (acc, m) => {
      for (const k of Object.keys(acc) as (keyof Throwables)[]) acc[k] += m.throwables[k];
      return acc;
    },
    { grenade: 0, smoke: 0, molotov: 0, flash: 0, other: 0 } as Throwables,
  );
  return {
    /** Trung vị số giây tới lúc có súng chính / giáp ≥ 2 / mũ ≥ 2 (chỉ tính người có) */
    firstWeapon: median(times("firstWeapon")),
    armor2: median(times("armor2")),
    helmet2: median(times("helmet2")),
    /** Số thành viên có được giáp / mũ ≥ 2 */
    armor2Got: { n: times("armor2").length, of: ms.length } as Ratio,
    helmet2Got: { n: times("helmet2").length, of: ms.length } as Ratio,
    thrown,
    /** Vật phẩm ném (lựu đạn + smoke + molotov + flash) mỗi người */
    throwsPerMember: (thrown.grenade + thrown.smoke + thrown.molotov + thrown.flash) / n,
    throwDamage: ms.reduce((s, m) => s + m.throwDamage, 0),
    smokeRevive: { n: l.smokeRevives, of: l.revives } as Ratio,
  };
}
export type LootSummary = ReturnType<typeof summarizeLoot>;
