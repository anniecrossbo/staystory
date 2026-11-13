// The Luna bundle reads React from window. This module must be imported before the bundle.
import * as React from 'react';
(window as unknown as { React: typeof React }).React = React;
