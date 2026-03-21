export class SdpConditionEngine {

  static get(actor, key){
    return actor.system.conditions?.[key] ?? 0;
  }

  static async add(actor, key, value = 1){

    const config = SDP.conditionConfig[key];

    if(config?.type === "state"){

      await actor.update({
        [`system.conditions.${key}`]: true,
        [`system.conditionManual.${key}`]: false
      });

      return;
    }

    const current = this.get(actor, key);
    const newValue = current + value;

    await actor.update({
      [`system.conditions.${key}`]: newValue,
      [`system.conditionManual.${key}`]: false
    });

  }

  static async remove(actor, key, value = 1){

    const config = SDP.conditionConfig[key];

    if(config?.type === "state"){

      await actor.update({
        [`system.conditions.${key}`]: false,
        [`system.conditionManual.${key}`]: false
      });

      return;
    }

    const current = this.get(actor, key);
    const newValue = Math.max(current - value, 0);

    await actor.update({
      [`system.conditions.${key}`]: newValue,
      [`system.conditionManual.${key}`]: false
    });

  }

  static async clear(actor, key){

    const config = SDP.conditionConfig[key];

    if(config?.type === "state"){

      await actor.update({
        [`system.conditions.${key}`]: false,
        [`system.conditionManual.${key}`]: false
      });

      return;
    }

    await actor.update({
      [`system.conditions.${key}`]: 0,
      [`system.conditionManual.${key}`]: false
    });

  }

}