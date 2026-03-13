import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';
import type { RefObject } from 'react';

/**
 * Capture any native view ref as a high-res PNG, then open the
 * system share sheet. Falls back to saving to photo library.
 */
export async function captureAndShare(viewRef: RefObject<any>): Promise<void> {
  try {
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      // Slightly larger than device pixel ratio for crisp social shares
      snapshotContentContainer: false,
    });
    await shareUri(uri);
  } catch (e: any) {
    // User tapped cancel on share sheet — silent dismiss
    if (
      e?.message?.includes('User did not share') ||
      e?.message?.includes('cancelled') ||
      e?.code === 'E_SHARE_CANCELLED'
    ) return;
    console.warn('[Share] captureAndShare error:', e);
    Alert.alert('Oops', 'Could not share. Please try again.');
  }
}

/**
 * Open the native share sheet for a local file URI.
 */
export async function shareUri(uri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: 'Share your Vocally card',
      UTI: 'public.png',
    });
  } else {
    // Device doesn't support sharing (e.g. some simulators) — save instead
    await saveToPhotos(uri);
  }
}

/**
 * Save a local file URI to the user's photo library.
 * Returns true on success.
 */
export async function saveToPhotos(uri: string): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please allow photo library access in Settings to save images.',
      );
      return false;
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    Alert.alert('Saved! 🎉', 'Your card image was saved to your photo library.');
    return true;
  } catch (e) {
    console.warn('[Share] saveToPhotos error:', e);
    Alert.alert('Oops', 'Could not save to photos. Please try again.');
    return false;
  }
}
