import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { getErrorMessage } from '../api/client';
import { showAlert } from '../components/AppAlert';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { Logo } from '../components/Logo';
import { Screen } from '../components/Screen';
import { Text } from '../components/Text';
import { useAuth } from '../features/auth/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { spacing } from '../theme/spacing';

const schema = z.object({
  otpCode: z.string().regex(/^\d{6}$/, 'Enter the 6 digit code'),
});

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOtp'>;
type FormValues = z.infer<typeof schema>;

export function VerifyOtpScreen({ navigation, route }: Props) {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otpCode: '' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await auth.verifyOtp(route.params.email, values.otpCode);
      showAlert('Email verified', 'Your account is ready — sign in to continue.', [
        { text: 'Continue', onPress: () => navigation.replace('Login') },
      ]);
    } catch (error) {
      showAlert('Verification failed', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      await auth.resendOtp(route.params.email);
      showAlert('Code sent', `A new code is on its way to ${route.params.email}.`);
    } catch (error) {
      showAlert('Could not resend', getErrorMessage(error));
    } finally {
      setResending(false);
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
            {route.params.email}
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
              keyboardType="number-pad"
              label="Verification code"
              maxLength={6}
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.otpCode?.message}
            />
          )}
        />
        <Button title="Verify & continue" icon="check" loading={loading} onPress={handleSubmit(onSubmit)} />
        <Button title="Resend code" variant="ghost" loading={resending} onPress={resend} />
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
