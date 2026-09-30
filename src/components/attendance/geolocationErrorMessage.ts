export function getGeolocationErrorMessage(error: Pick<GeolocationPositionError, 'code' | 'message'>): string {
  let explanation: string;
  switch (error.code) {
    case 1:
      explanation = 'Location permission was denied. Allow Location for this site and check your device location settings.';
      break;
    case 2:
      explanation = 'Your device could not determine its location. Turn on device location services and try again.';
      break;
    case 3:
      explanation = 'The location request timed out. Try again, or choose the point directly on the map.';
      break;
    default:
      explanation = 'Could not read this device location. Try again, or choose the point directly on the map.';
  }
  return error.message ? `${explanation} Browser details: ${error.message}` : explanation;
}
