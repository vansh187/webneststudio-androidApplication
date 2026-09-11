import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import { getErrorMessage } from '../api/client';
import { showAlert } from '../components/AppAlert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { Logo } from '../components/Logo';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { LEGAL } from '../data/content';
import { useAuth } from '../features/auth/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radii, spacing } from '../theme/spacing';
import { openExternal } from '../utils/linking';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
type FormValues = z.infer<typeof schema>;

export function LoginScreen({ navigation }: Props) {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const isFace = auth.biometry === 'face';
  const bioLabel = isFace ? 'Log in with Face' : 'Log in with fingerprint';
  const bioGlyph = isFace ? 'face-recognition' : 'fingerprint';

  const runBiometricLogin = useCallback(async () => {
    if (bioLoading || loading) {
      return;
    }
    setBioLoading(true);
    try {
      const ok = await auth.loginWithBiometrics();
      if (!ok) {
        // user cancelled the prompt — stay on the form silently
        return;
      }
      // success flips auth state and the app tree mounts automatically
    } catch (error) {
      showAlert(
        "Couldn't sign in",
        getErrorMessage(error, 'Use your email and password this time.'),
      );
    } finally {
      setBioLoading(false);
    }
  }, [auth, bioLoading, loading]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await auth.login(values.email, values.password);
      // Signed in. If the device can do biometrics and it isn't set up yet,
      // offer to enable it for next time.
      if (auth.biometry && !auth.biometricEnabled) {
        showAlert(
          isFace ? 'Enable Face login?' : 'Enable fingerprint login?',
          'Skip typing your email and password next time.',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Enable',
              onPress: async () => {
                const ok = await auth.enableBiometrics(values.email, values.password);
                showAlert(
                  ok ? 'All set' : "Couldn't enable it",
                  ok
                    ? `Next time, use your ${isFace ? 'face' : 'fingerprint'} to sign in.`
                    : 'You can try again from your profile.',
                );
              },
            },
          ],
        );
      }
    } catch (error) {
      showAlert('Login failed', getErrorMessage(error, 'Check your email and password.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.content}>
      <View style={styles.header}>
        <Logo size="lg" />
        <Badge label="Client access" />
        <Text variant="title">Welcome back.</Text>
        <Text variant="body">Sign in to track your project from WebNest Studio.</Text>
      </View>

      <Card variant="elevated" style={styles.card}>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <FormInput
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <FormInput
              label="Password"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.password?.message}
            />
          )}
        />
        <Button title="Log in" icon="arrow-right" loading={loading} onPress={handleSubmit(onSubmit)} />

        {auth.biometricEnabled ? (
          <>
            <View style={styles.orRow}>
              <View style={styles.orLine} />
              <Text variant="caption" tone="tertiary" style={styles.orText}>
                OR
              </Text>
              <View style={styles.orLine} />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={runBiometricLogin}
              disabled={bioLoading}
              style={({ pressed }) => [
                styles.bioBtn,
                pressed && styles.bioBtnPressed,
                bioLoading && styles.bioBtnPressed,
              ]}>
              <MCIcon name={bioGlyph} size={22} color={colors.goldPrimary} />
              <Text variant="button" tone="gold" style={styles.bioText}>
                {bioLoading ? 'WAITING…' : bioLabel.toUpperCase()}
              </Text>
            </Pressable>
          </>
        ) : null}
      </Card>

      <Pressable style={styles.altRow} onPress={() => navigation.navigate('Signup')}>
        <Text variant="body">New to WebNest Studio? </Text>
        <Text variant="bodyStrong" tone="gold">
          Create an account
        </Text>
      </Pressable>
      <Pressable style={styles.altRow} onPress={() => openExternal(LEGAL.privacyPolicyHref)}>
        <Text variant="caption" tone="tertiary">Privacy policy</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingTop: spacing.xl,
  },
  header: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.lg,
  },
  orRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: -spacing.xs,
  },
  orLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orText: {
    letterSpacing: 2,
  },
  bioBtn: {
    alignItems: 'center',
    borderColor: colors.goldOutline,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
  },
  bioBtnPressed: {
    opacity: 0.6,
  },
  bioText: {
    fontSize: 13,
    letterSpacing: 1.4,
  },
  altRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
