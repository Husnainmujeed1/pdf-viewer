import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import { prepareForShare } from './files';
import { PdfDoc } from './types';

export async function pickPdfs() {
  const res = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    multiple: true,
    // We copy into our own library folder ourselves, so skip the extra cache copy.
    copyToCacheDirectory: false,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => ({ uri: a.uri, name: a.name, size: a.size ?? null }));
}

export async function shareDoc(doc: PdfDoc) {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
      return;
    }
    const uri = await prepareForShare(doc.uri, doc.name);
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: doc.name, UTI: 'com.adobe.pdf' });
  } catch (e) {
    console.warn('[share]', e);
    Alert.alert('Could not share', 'Something went wrong while sharing this file.');
  }
}

export async function printDoc(doc: PdfDoc) {
  try {
    await Print.printAsync({ uri: doc.uri });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    // Cancelling the print dialog is not an error worth surfacing.
    if (/cancel/i.test(msg)) return;
    console.warn('[print]', e);
    Alert.alert('Could not print', doc.locked ? 'Password-protected PDFs cannot be printed.' : 'This document could not be sent to the printer.');
  }
}
