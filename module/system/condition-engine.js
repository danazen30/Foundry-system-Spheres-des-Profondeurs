import { SDP } from "./config.js";

/** États cumulables : +1 Épuisé uniquement quand la pile tombe à 0. */
const RECOVERY_EXHAUST_KEYS = [
  "stunned",
  "poisoned",
  "bleeding"
];

export class SdpConditionEngine {

  static get(actor, key){
    return actor.system.conditions?.[key] ?? 0;
  }

  /**
   * +1 Épuisé si une pile stunned/poisoned/bleeding vient de tomber à 0.
   */
  static async _applyRecoveryExhaustion(
    actor,
    key,
    previous,
    newValue
  ) {

    if (
      !RECOVERY_EXHAUST_KEYS.includes(key)
      || newValue !== 0
      || previous <= 0
    ) {
      return;
    }

    await this.add(actor, "exhausted", 1);

  }

static async add(actor, key, value = 1){
 console.log("🔥 CONDITION ADD CALLED", { key, value });
  const config = SDP.conditionConfig[key];

  // =====================
  // FRIGHTENED OVERRIDE
  // =====================

  if(key === "frightened"){
    await actor.update({
      "system.conditions.shaken": false
    });
  }

  // =====================
  // STATE CONDITIONS
  // =====================

  if(config?.type === "state"){

    await actor.update({
      [`system.conditions.${key}`]: true
    });

    return;
  }

  // =====================
  // STACK CONDITIONS
  // =====================

  const current = this.get(actor, key);
  const newValue = current + value;

  // 🔥 UN SEUL UPDATE
  await actor.update({
    [`system.conditions.${key}`]: newValue
  });

  // =====================
  // EXHAUSTION LIMIT
  // =====================

  if (key === "exhausted") {

    // 🔥 DEBUG (OBLIGATOIRE)
    console.log("EXHAUST BEFORE PREPARE", {
      newValue,
      thresholdBefore: actor.system.derived?.woundThreshold?.value
    });

const threshold = actor.system.derived?.woundThreshold?.value || 0;

console.log("EXHAUST CHECK FINAL", {
  newValue,
  threshold
});

if (newValue >= threshold && threshold > 0) {

  console.log("🔥 TRIGGER UNCONSCIOUS");

  await actor.update({
    "system.conditions.unconscious": true,
    "system.conditions.prone": true
  });

}

  }

}

  static async remove(actor, key, value = 1){

    const config = SDP.conditionConfig[key];

    // =====================
    // STATE CONDITIONS
    // =====================

    if(config?.type === "state"){

      await actor.update({
        [`system.conditions.${key}`]: false
      });

      return;
    }

    // =====================
    // STACK CONDITIONS
    // =====================

    const current = this.get(actor, key);
    const newValue = Math.max(current - value, 0);

    await actor.update({
      [`system.conditions.${key}`]: newValue
    });

    await this._applyRecoveryExhaustion(
      actor,
      key,
      current,
      newValue
    );

  }

  static async clear(actor, key){

    const config = SDP.conditionConfig[key];

    // =====================
    // STATE CONDITIONS
    // =====================

    if(config?.type === "state"){

      await actor.update({
        [`system.conditions.${key}`]: false
      });

      return;
    }

    // =====================
    // STACK CONDITIONS
    // =====================

    const current = this.get(actor, key);

    await actor.update({
      [`system.conditions.${key}`]: 0
    });

    await this._applyRecoveryExhaustion(
      actor,
      key,
      current,
      0
    );

  }

}