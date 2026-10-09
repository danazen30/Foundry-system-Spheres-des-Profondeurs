/**
 * Foundry v14 stores Active Effect changes on effect.system.changes.
 * v13 still stores them on effect.changes. The change keys themselves
 * (system.attributes.*, system.custom.*, …) are unchanged.
 */

export function getEffectChanges(effect) {
  if (!effect) return [];

  const systemChanges = effect.system?.changes;
  const legacyChanges = effect.changes;

  if (Array.isArray(systemChanges) && systemChanges.length) return systemChanges;
  if (Array.isArray(legacyChanges) && legacyChanges.length) return legacyChanges;
  if (Array.isArray(systemChanges)) return systemChanges;
  if (Array.isArray(legacyChanges)) return legacyChanges;
  return [];
}

export function setEffectChanges(effect, changes) {
  if (!effect) return;
  if (Array.isArray(effect.system?.changes)) {
    effect.system.changes = changes;
    return;
  }
  effect.changes = changes;
}

export function newActiveEffectData(name) {
  const data = {
    name,
    img: "icons/svg/aura.svg"
  };

  if (foundry.data?.ActiveEffectTypeDataModel) {
    data.system = { changes: [] };
  } else {
    data.changes = [];
  }

  return data;
}
