import { Easing } from 'react-native-reanimated';

// Common Easing Curves
export const curves = {
    // Apple-style swift gentle curve
    standard: Easing.bezier(0.2, 0.0, 0, 1.0),
    // Bouncier, playful curve
    expressive: Easing.bezier(0, 0, 0, 1.2),
    // Netflix/Cinematic smooth fade
    cinematic: Easing.bezier(0.4, 0, 0.2, 1),
    // Swift out
    swiftOut: Easing.out(Easing.exp),
};

// Common Time Durations (ms)
export const durations = {
    fast: 150,
    base: 250,
    epic: 400,
    cinematic: 600,
};

// Reanimated Spring Configs
export const springs = {
    gentle: {
        damping: 20,
        stiffness: 90,
        mass: 0.5,
        overshootClamping: false,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
    },
    bouncy: {
        damping: 12,
        stiffness: 150,
        mass: 0.5,
    },
    snappy: {
        damping: 25,
        stiffness: 250,
        mass: 0.5,
    },
    modal: {
        damping: 25,
        stiffness: 120,
        mass: 0.8,
    }
};

export const motion = {
    curves,
    durations,
    springs
};
