# Game design

## Response loop

Choose an arena, mode and threat level. Move and aim independently, fire, use dash to evade, and decide whether to pursue enemies or protect the mission. Between waves, spend upgrade points and collect supplies. A dead saboteur cannot destroy a relay; a dead carrier drops its stolen cell. Objectives are physical world entities, not progress timers.

Difficulty scales enemy health and damage: Recruit 0.7×, Standard 1×, Veteran 1.35×. Wave composition grows with wave number and local player count. Active wave spawning stops at 42 enemies. Bosses appear every fifth survival wave and on the fourth operation wave. Survival scales enemy health beyond wave four and never ends in victory; defeat records the score.

Each wave grants one upgrade point and a partial ammunition resupply. Upgrades have five ranks and affect damage, cadence, ammo capacity, spread, projectile count, penetration, blast radius, equipment limits and recharge. The pistol has infinite ammunition. Other weapons have a finite ammunition pool; there is no separate magazine/reload input.

## Tactical enemies

- Walker chases and attacks in melee.
- Runner trades health for speed.
- Brute has high health and rapidly destroys barricades.
- Ranged unit stops at firing range and retreats if approached.
- Saboteur routes to a relay, starts sabotage at interaction range and inflicts repeated structural damage. Hits interrupt its next sabotage tick.
- Scavenger chooses an available cell, collects it, visibly carries it and returns to a side portal. Successful arrival increments extraction. Killing a carrier drops its cell.
- Guardian escorts important allies and halves incoming damage to nearby enemies.
- Bomber stops and telegraphs before detonating.
- Sovereign fires radial and aimed attacks, increases pressure at 70% and 40% health, and summons reinforcements on phase transitions.

A* paths use cardinal neighbours on a one-unit grid with agent radius, static collision and live deployed equipment. Routes are refreshed on a staggered cadence. Enemies attack nearby barricades; otherwise they navigate around obstacles. Separation prevents exact crowd overlap. Solid obstacles block movement and shots; reflecting water blocks movement but not shots at weapon height.

## Local multiplayer

Co-op shares objectives, score, drops and camera but keeps health, weapons, ammo, buffs and upgrades per player. Hold Interact near a downed partner to revive. Both players down means defeat. Deathmatch disables enemy waves and mission failure, enables player-versus-player projectile damage, supplies weapon pickups, respawns eliminated players, and ends at five frags.

## Campaign and free play

Campaign starts at Taj Mahal with the service pistol, SMG, shotgun and barrels. Subsequent waves requisition additional equipment. Completing an operation unlocks the next arena and a veteran cosmetic; requisitions persist. Survival and Deathmatch are unrestricted practice/free-play modes.

Landmarks are fictional low-poly interpretations built from original geometry. They cannot be destroyed. Only deployed equipment, pickups, enemies and mission structures participate in destruction.
