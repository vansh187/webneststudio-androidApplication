/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { LEGAL } from '../src/data/content';
import { SignupScreen } from '../src/screens/SignupScreen';
import { openExternal } from '../src/utils/linking';

jest.mock('../src/features/auth/AuthContext', () => ({
  useAuth: () => ({ signup: jest.fn() }),
}));
jest.mock('../src/utils/linking', () => ({ openExternal: jest.fn() }));

function textOf(node: ReactTestRenderer.ReactTestInstance): string {
  return node.children
    .map(child => (typeof child === 'string' ? child : textOf(child)))
    .join('');
}

describe('SignupScreen consent', () => {
  it('links to the terms and privacy policy and states the content rule', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <SignupScreen {...({ navigation: {}, route: {} } as any)} />,
      );
    });
    const root = tree.root;

    expect(textOf(root)).toContain('Abusive or objectionable content');

    const terms = root.findAll(n => n.props.children === 'terms' && !!n.props.onPress);
    const privacy = root.findAll(
      n => n.props.children === 'privacy policy' && !!n.props.onPress,
    );
    expect(terms.length).toBeGreaterThan(0);
    expect(privacy.length).toBeGreaterThan(0);

    terms[0].props.onPress();
    privacy[0].props.onPress();
    expect(openExternal).toHaveBeenCalledWith(LEGAL.termsHref);
    expect(openExternal).toHaveBeenCalledWith(LEGAL.privacyPolicyHref);
  });
});
