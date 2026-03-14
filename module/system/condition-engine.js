export class SdpConditionEngine {

  // ===============================
  // CHECK CONDITION
  // ===============================

  static hasCondition(actor, key){

    return actor.items.find(i =>
      i.type === "condition" && i.system.key === key
    );

  }

  // ===============================
  // APPLY CONDITION
  // ===============================

  static async applyCondition(actor, key, value = 1){

    const existing = actor.items.find(i =>
      i.type === "condition" && i.system.key === key
    );

    if(existing){

      const stack = existing.system.stack || 1;

      await existing.update({
        "system.stack": stack + value
      });

      await this.updateConditionEffects(existing);

      return existing;

    }

    const pack = game.packs.get("sdp.conditions");

    const index = await pack.getIndex();

    const entry = index.find(e => e.system.key === key);

    if(!entry) return;

    const doc = await pack.getDocument(entry._id);

    const data = doc.toObject();

    data.system.stack = value;

    const created = await actor.createEmbeddedDocuments("Item",[data]);

    const condition = created[0];

    await this.updateConditionEffects(condition);

    return condition;

  }

  // ===============================
  // REMOVE CONDITION
  // ===============================

  static async removeCondition(actor, key, stacks = 1){

    const existing = this.hasCondition(actor, key);

    if(!existing) return;

    const current = existing.system.stack || 1;

    const newStack = current - stacks;

    if(newStack <= 0){

      await actor.deleteEmbeddedDocuments("Item",[existing.id]);

    }else{

      await existing.update({
        "system.stack": newStack
      });

      await this.updateConditionEffects(existing);

    }

  }

  // ===============================
  // CLEAR CONDITION
  // ===============================

  static async clearCondition(actor, key){

    const existing = this.hasCondition(actor, key);

    if(!existing) return;

    await actor.deleteEmbeddedDocuments("Item",[existing.id]);

  }

  // ===============================
  // UPDATE EFFECTS BY STACK
  // ===============================

  static async updateConditionEffects(condition){

    const stack = condition.system.stack || 1;

    for(const effect of condition.effects){

      for(const change of effect.changes){

        const base = Number(change.value) || 0;

        const newValue = base * stack;

        change.value = newValue;

      }

      await effect.update({
        changes: effect.changes
      });

    }

  }

}