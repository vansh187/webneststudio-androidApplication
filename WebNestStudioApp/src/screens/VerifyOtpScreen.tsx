import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { getErrorMessage, getRetryAfterSeconds } from '../api/client';
import { showAlert } from '../components/AppAlert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { Logo } from '../components/Logo';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { useAuth } from '../features/auth/AuthContext';
import { RESEND_COOLDOWN_SECONDS, useCooldown } from '../features/auth/useCooldown';
import { AuthStackParamList } from '../navigation/types';
import { spacing } from '../theme/spacing';

const schema = z.object({
  otpCode: z.string().trim().regex(/^\d{6}$/, 'Enter the 6 digit code'),
});

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;
type FormValues = z.infer<typeof schema>;

export function VerifyOtpScreen({ navigation, route }: Props) {
  const { email, sendCode } = route.params;
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  // Coming from Signup the backend has just mailed a code, so start counting.
  const cooldown = useCooldown(sendCode ? 0 : RESEND_COOLDOWN_SECONDS);
  const startCooldown = cooldown.start;
  const autoSent = useRef(false);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otpCode: '' },
  });

  const requestCode = useCallback(
    async (announce: boolean) => {
      setResending(true);
      try {
        await auth.resendOtp(email);
        startCooldown();
        if (announce) {
          showAlert('Code sent', `A new code is on its way to ${email}.`);
        }
      } catch (error) {
        const wait = getRetryAfterSeconds(error);
        if (wait !== undefined) {
          // A code went out moments ago — it is still usable.
          startCooldown(wait);
        } else {
          showAlert('Could not send code', getErrorMessage(error));
        }
      } finally {
        setResending(false);
      }
    },
    [auth, startCooldown, email],
  );

  useEffect(() => {
    // Login / re-signup land here without a code in the inbox; send one once.
    if (sendCode && !autoSent.current) {
      autoSent.current = true;
      requestCode(false);
    }
  }, [sendCode, requestCode]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const signedIn = await auth.verifyOtp(email, values.otpCode);
      if (signedIn) {
        // Auth state flipped — the app tree replaces this screen.
        return;
      }
      showAlert('Email verified', 'Your account is ready — sign in to continue.', [
        { text: 'Continue', onPress: () => navigation.replace('Login') },
      ]);
    } catch (error) {
      showAlert('Verification failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.content}>
      <View style={styles.header}>
        <Logo size="lg" />
        <Badge label="Verify email" />
        <Text variant="title">Confirm it's you.</Text>
        <Text variant="body">
          Enter the 6-digit code we sent to{' '}
          <Text variant="bodyStrong" tone="primary">
            {email}
          </Text>
          .
        </Text>
      </View>

      <Card variant="elevated" style={styles.card}>
        <Controller
          control={control}
          name="otpCode"
          render={({ field }) => (
            <FormInput
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              keyboardType="number-pad"
              label="Verification code"
              maxLength={6}
              value={field.value}
              onChangeText={text => field.onChange(text.replace(/\D/g, ''))}
              error={formState.errors.otpCode?.message}
              hint="Not in your inbox? Check spam or promotions."
            />
          )}
        />
        <Button title="Verify & continue" icon="check" loading={loading} onPress={handleSubmit(onSubmit)} />
        <Button
          title={cooldown.active ? `Resend code in ${cooldown.remaining}s` : 'Resend code'}
          variant="ghost"
          loading={resending}
          disabled={cooldown.active}
          onPress={() => requestCode(true)}
        />
      </Card>

      <Pressable style={styles.altRow} onPress={() => navigation.replace('Login')}>
        <Text variant="bodyStrong" tone="gold">
          Back to login
        </Text>
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
    gap: spacing.md,
  },
  altRow: {
    alignItems: 'center',
  },
});
