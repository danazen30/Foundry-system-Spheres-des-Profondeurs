import { SdpItemSheet } from "./item-sheet.js";
import {
  buildInjuryKey,
  getInjuryLocationOptions,
  getInjurySeverityOptions,
  getManualHitLocationOptions,
  resolveInjuryVariantFlags
} from "../system/injury-utils.js";

export class SdpInjurySheet extends SdpItemSheet {

  static PARTS = {
    sheet: {
      template:
        "systems/sdp/templates/items/injury-sheet.hbs"
    }
  };

  async _prepareContext() {

    const context =
      await super._prepareContext();

    const severity =
      this.document.system.severity ?? "";

    const location =
      this.document.system.location ?? "";

    const hitLocation =
      this.document.system.hitLocation ?? "";

    const variantFlags =
      resolveInjuryVariantFlags(this.document.system);

    context.isOnActor =
      !!this.actor;

    context.severityOptions =
      getInjurySeverityOptions(severity);

    context.locationOptions =
      getInjuryLocationOptions(location);

    context.hitLocationOptions =
      getManualHitLocationOptions(hitLocation);

    context.computedKey =
      buildInjuryKey(
        severity,
        location,
        variantFlags
      );

    context.durationDisplay =
      this.document.system.duration ?? "";

    return context;

  }

}
