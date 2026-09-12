const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

const legacyRules = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
  <exclude domain="file" path="media/sounds" />
</full-backup-content>
`;

const extractionRules = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="file" path="media/sounds" />
  </cloud-backup>
  <device-transfer>
    <include domain="file" path="." />
    <include domain="database" path="." />
    <include domain="sharedpref" path="." />
  </device-transfer>
</data-extraction-rules>
`;

module.exports = function withAndroidBackupRules(config) {
  config = withAndroidManifest(config, (androidConfig) => {
    const application = androidConfig.modResults.manifest.application?.[0];
    if (!application)
      throw new Error("Android application manifest is missing.");
    application.$["android:fullBackupContent"] = "@xml/backup_rules";
    application.$["android:dataExtractionRules"] = "@xml/data_extraction_rules";
    return androidConfig;
  });

  return withDangerousMod(config, [
    "android",
    async (androidConfig) => {
      const resourceDirectory = path.join(
        androidConfig.modRequest.platformProjectRoot,
        "app/src/main/res/xml",
      );
      await fs.mkdir(resourceDirectory, { recursive: true });
      await Promise.all([
        fs.writeFile(
          path.join(resourceDirectory, "backup_rules.xml"),
          legacyRules,
        ),
        fs.writeFile(
          path.join(resourceDirectory, "data_extraction_rules.xml"),
          extractionRules,
        ),
      ]);
      return androidConfig;
    },
  ]);
};
