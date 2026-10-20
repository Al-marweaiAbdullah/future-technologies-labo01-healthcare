import '@testing-library/jest-dom';
import { render } from '@lynx-js/react/testing-library';
import { expect, test } from '@rstest/core';

import { App } from '../App';

test('App toont dat het een prototype is', async () => {
  const { findByText } = render(<App />);
  const banner = await findByText('Prototype – geen medisch hulpmiddel');

  expect(banner).toBeInTheDocument();
});

test('App start op het kameroverzicht', async () => {
  const { findByText } = render(<App />);

  expect(await findByText('Kamers')).toBeInTheDocument();
});
