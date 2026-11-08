import { Redirect } from 'expo-router';

/** Any unknown deep link simply lands on the library. */
export default function NotFound() {
  return <Redirect href="/" />;
}
