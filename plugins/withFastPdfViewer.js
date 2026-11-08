/**
 * Swaps react-native-pdf's AndroidPdfViewer dependency for the patched copy in
 * native/android-pdf-viewer (see native/android-pdf-viewer/README.md).
 *
 * The stock library opens every page just to read its size and reloads the document
 * 2-3 times on mount, so a 3,500-page book took over a minute to open.
 */
const { withProjectBuildGradle } = require('expo/config-plugins');

const TAG = '// @generated pdf-reader-fast-pdf-viewer';

const GRADLE = `
${TAG}
// Use the vendored, patched AndroidPdfViewer instead of the Maven artifact.
allprojects {
    configurations.configureEach {
        exclude group: 'com.github.zacharee', module: 'AndroidPdfViewer'
    }
}
subprojects { sp ->
    if (sp.name == 'react-native-pdf') {
        sp.plugins.withId('com.android.library') {
            sp.android.sourceSets.main.java.srcDirs += [new File(rootDir, '../native/android-pdf-viewer/java')]
        }
    }
}
`;

module.exports = function withFastPdfViewer(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withFastPdfViewer: expected a Groovy android/build.gradle');
    }
    if (!cfg.modResults.contents.includes(TAG)) {
      cfg.modResults.contents = cfg.modResults.contents.trimEnd() + '\n' + GRADLE;
    }
    return cfg;
  });
};
