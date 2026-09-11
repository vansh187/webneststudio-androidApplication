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
import { LEGAL } from '../data/content';
import { useAuth } from '../features/auth/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { spacing } from '../theme/spacing';
import { openExternal } from '../utils/linking';

const schema = z.object({
  full_name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  phone_number: z.string().min(8, 'Enter a valid phone number'),
  password: z.string().min(8, 'Use at least 8 characters'),
});

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;
type FormValues = z.infer<typeof schema>;

export function SignupScreen({ navigation }: Props) {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', phone_number: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const user = await auth.signup(values);
      if (user.is_verified) {
        navigation.replace('Login');
      } else {
        navigation.replace('VerifyOtp', { email: values.email });
      }
    } catch (error) {
      showAlert('Could not create account', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen style={styles.content}>
      <View style={styles.header}>
        <Logo size="lg" />
        <Badge label="Create account" />
        <Text variant="title">Your private client studio, on Android.</Text>
        <Text variant="body">
          Create an account to track projects, milestones, and files from WebNest Studio.
        </Text>
      </View>

      <Card variant="elevated" style={styles.card}>
        <Controller
          control={control}
          name="full_name"
          render={({ field }) => (
            <FormInput
              label="Full name"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.full_name?.message}
            />
          )}
        />
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
          name="phone_number"
          render={({ field }) => (
            <FormInput
              keyboardType="phone-pad"
              label="Phone"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.phone_number?.message}
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
              hint="At least 8 characters"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.password?.message}
            />
          )}
        />
        <Button title="Create account" icon="arrow-right" loading={loading} onPress={handleSubmit(onSubmit)} />
      </Card>

      <Pressable style={styles.altRow} onPress={() => navigation.navigate('Login')}>
        <Text variant="body">Already have an account? </Text>
        <Text variant="bodyStrong" tone="gold">
          Log in
        </Text>
      </Pressable>
      <Pressable style={styles.altRow} onPress={() => openExternal(LEGAL.privacyPolicyHref)}>
        <Text variant="caption" tone="tertiary">By creating an account, you agree to our </Text>
        <Text variant="caption" tone="gold">privacy policy</Text>
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
  altRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
