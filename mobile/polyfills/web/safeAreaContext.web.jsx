export {
	SafeAreaProvider,
	SafeAreaInsetsContext,
	SafeAreaFrameContext,
	useSafeAreaFrame,
	initialWindowMetrics,
} from 'react-native-safe-area-context/lib/commonjs';
import { useSafeAreaInsets as useNativeSafeAreaInsets } from 'react-native-safe-area-context/lib/commonjs';
import { useState, useEffect } from 'react';

export { SafeAreaView } from './SafeAreaView.web';

export const useSafeAreaInsets = () => {
	// Inicializado con true para coincidir con el valor del servidor (window undefined → true)
	const [isTabletAndAbove, setIsTabletAndAbove] = useState(true);
	useEffect(() => {
		setIsTabletAndAbove(window.self !== window.top);
	}, []);
	const insets = useNativeSafeAreaInsets();
	if (isTabletAndAbove) {
		return {
			left: 0,
			right: 0,
			top: 64,
			bottom: 34,
		};
	}
	return insets;
};
