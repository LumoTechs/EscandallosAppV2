import { Redirect } from "expo-router";

export default function Index() {
  if (typeof window !== "undefined" && window.location.hostname === "casadiego.lumotech.app") {
    return <Redirect href="/demo-costes" />;
  }
  return <Redirect href="/(tabs)" />;
}
