import './react-global';
import '../vendor/luna-tokens.css';
import '../vendor/bundle.css';
import '../vendor/bundle.js';
import type * as T from '../vendor/components';

export const Luna = (window as unknown as { Luna: typeof T }).Luna;
export type * from '../vendor/components';
