import { Tabs as ExpoTabs } from 'expo-router/build/layouts/Tabs';
import { merge } from 'lodash';
import { forwardRef, useState, useEffect } from 'react';
import { Platform } from 'react-native';
export const BASE_TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;

export const Tabs = forwardRef((props, ref) => {
  // Inicializado con false para coincidir con el valor del servidor (window undefined → false)
  const [isInIframe, setIsInIframe] = useState(false);
  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);
  const height = props.screenOptions.tabBarStyle?.height || (BASE_TAB_BAR_HEIGHT + (isInIframe ? 34 : 0));

  return (
    <ExpoTabs
      {...props}
      screenOptions={merge(props.screenOptions, {
        tabBarStyle: merge(props.screenOptions.tabBarStyle, { height }),
      })}
      ref={ref}
    />
  );
});

Tabs.Screen = ExpoTabs.Screen;

export default Tabs;
