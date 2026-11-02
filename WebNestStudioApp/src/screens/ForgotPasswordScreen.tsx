import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { getErrorMessage, getRetryAfterSeconds, isUnverifiedEmailError } from '../api/client';
import { showAlert } from '../components/AppAlert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { Logo } from '../components/Logo';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { useAuth } from '../features/auth/AuthContext';
import { useCooldown } from '../features/auth/useCooldown';
import { AuthStackParamList } from '../navigation/types';
import { spacing } from '../theme/spacing';

const emailSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
});

const resetSchema = z
  .object({
    otpCode: z.string().trim().regex(/^\d{6}$/, 'Enter the 6 digit code'),
    newPassword: z.string().min(8, 'Use at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(values => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;
type EmailValues = z.infer<typeof emailSchema>;
type ResetValues = z.infer<typeof resetSchema>;

export function ForgotPasswordScreen({ navigation, route }: Props) {
  const auth = useAuth();
  // Set once a code has been sent; switches the screen to step 2.
  const [email, setEmail] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const cooldown = useCooldown();

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: route.params?.email ?? '' },
  });
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otpCode: '', newPassword: '', confirmPassword: '' },
  });

  async function sendCode(address: string) {
    setSending(true);
    try {
      await auth.resendOtp(address, 'password_reset');
      cooldown.start();
      setEmail(address);
    } catch (error) {
      const wait = getRetryAfterSeconds(error);
      if (wait !== undefined) {
        // A reset code went out moments ago — it is still usable.
        cooldown.start(wait);
        setEmail(address);
      } else {
        showAlert('Could not send code', getErrorMessage(error));
      }
    } finally {
      setSending(false);
    }
  }

  async function onReset(values: ResetValues) {
    if (!email) {
      return;
    }
    setSaving(true);
    try {
      await auth.resetPassword(email, values.otpCode, values.newPassword);
      // Signed in with the new password — the app tree replaces this screen.
    } catch (error) {
      if (isUnverifiedEmailError(error)) {
        // Password is changed; the account still needs its email confirmed.
        navigation.replace('VerifyOtp', { email, sendCode: true });
        return;
      }
      showAlert('Could not reset password', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen style={styles.content}>
      <View style={styles.header}>
        <Logo size="lg" />
        <Badge label="Reset password" />
        <Text variant="title">{email ? 'Choose a new password.' : 'Forgot your password?'}</Text>
        {email ? (
          <Text variant="body">
            Enter the 6-digit code we sent to{' '}
            <Text variant="bodyStrong" tone="primary">
              {email}
            </Text>{' '}
            and pick a new password.
          </Text>
        ) : (
          <Text variant="body">Enter your account email and we'll send you a reset code.</Text>
        )}
      </View>

      {email ? (
        <Card variant="elevated" style={styles.card}>
          <Controller
            control={resetForm.control}
            name="otpCode"
            render={({ field }) => (
              <FormInput
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                keyboardType="number-pad"
                label="Reset code"
                maxLength={6}
                value={field.value}
                onChangeText={text => field.onChange(text.replace(/\D/g, ''))}
                error={resetForm.formState.errors.otpCode?.message}
                hint="Not in your inbox? Check spam or promotions."
              />
            )}
          />
          <Controller
            control={resetForm.control}
            name="newPassword"
            render={({ field }) => (
              <FormInput
                label="New password"
                secureTextEntry
                autoComplete="new-password"
                hint="At least 8 characters"
                value={field.value}
                onChangeText={field.onChange}
                error={resetForm.formState.errors.newPassword?.message}
              />
            )}
          />
          <Controller
            control={resetForm.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormInput
                label="Confirm new password"
                secureTextEntry
                autoComplete="new-password"
                value={field.value}
                onChangeText={field.onChange}
                error={resetForm.formState.errors.confirmPassword?.message}
              />
            )}
          />
          <Button
            title="Reset & sign in"
            icon="check"
            loading={saving}
            onPress={resetForm.handleSubmit(onReset)}
          />
          <Button
            title={cooldown.active ? `Resend code in ${cooldown.remaining}s` : 'Resend code'}
            variant="ghost"
            loading={sending}
            disabled={cooldown.active}
            onPress={() => sendCode(email)}
          />
        </Card>
      ) : (
        <Card variant="elevated" style={styles.card}>
          <Controller
            control={emailForm.control}
            name="email"
            render={({ field }) => (
              <FormInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                label="Email"
                value={field.value}
                onChangeText={field.onChange}
                error={emailForm.formState.errors.email?.message}
              />
            )}
          />
          <Button
            title="Send reset code"
            icon="arrow-right"
            loading={sending}
            onPress={emailForm.handleSubmit(values => sendCode(values.email))}
          />
        </Card>
      )}

      <View style={styles.links}>
        {email ? (
          <Pressable onPress={() => setEmail(null)}>
            <Text variant="body" tone="secondary">
              Use a different email
            </Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => navigation.replace('Login')}>
          <Text variant="bodyStrong" tone="gold">
            Back to login
          </Text>
        </Pressable>
      </View>
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
    gap: spacing.md,
  },
  links: {
    alignItems: 'center',
    gap: spacing.md,
  },
});
