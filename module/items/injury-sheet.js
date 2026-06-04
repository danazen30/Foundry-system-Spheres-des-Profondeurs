import { SdpItemSheet } from "./item-sheet.js";
import {
  buildInjuryKey,
  getInjuryLocationOptions,
  getInjurySeverityOptions
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

    const consequence =
      this.document.system.consequence ?? false;

    context.severityOptions =
      getInjurySeverityOptions(severity);

    context.locationOptions =
      getInjuryLocationOptions(location);

    context.computedKey =
      buildInjuryKey(
        severity,
        location,
        consequence
      );

    context.durationDisplay =
      this.document.system.duration ?? "";

    return context;

  }

}
