import { Tabs } from "expo-router";
import { Home, Camera, Package, BookOpen, Bell } from "lucide-react-native";
import { Platform, View } from "react-native";

const T = {
  bg: "#FFFDF9",
  line: "#EFE8DD",
  ink: "#2B1D12",
  primary: "#B2451C",
  muted: "#9A8D7A",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: T.primary,
        tabBarInactiveTintColor: T.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.2,
        },
        tabBarStyle: {
          backgroundColor: "rgba(255,253,249,0.92)",
          borderTopColor: T.line,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 20 : 10,
          height: Platform.OS === "ios" ? 82 : 68,
          ...(Platform.OS === "web"
            ? { backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" }
            : {}),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, focused }) => (
            <Home size={20} color={color} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          title: "Factura",
          tabBarIcon: ({ color, focused }) => (
            <Camera size={20} color={color} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Productos",
          tabBarIcon: ({ color, focused }) => (
            <Package size={20} color={color} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Escandallos",
          tabBarIcon: ({ color, focused }) => (
            <BookOpen size={20} color={color} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alertas",
          tabBarIcon: ({ color, focused }) => (
            <Bell size={20} color={color} strokeWidth={focused ? 2.2 : 1.6} />
          ),
        }}
      />
    </Tabs>
  );
}
