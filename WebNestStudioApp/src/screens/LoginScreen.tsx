import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { getErrorMessage } from '../api/client';
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
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
type FormValues = z.infer<typeof schema>;

export function LoginScreen({ navigation }: Props) {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      // On success, auth state flips and the app tree mounts automatically.
      await auth.login(values.email, values.password);
    } catch (error) {
      Alert.alert('Login failed', getErrorMessage(error, 'Check your email and password.'));
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
      </Card>

      <Pressable style={styles.altRow} onPress={() => navigation.navigate('Signup')}>
        <Text variant="body">New to WebNest Studio? </Text>
        <Text variant="bodyStrong" tone="gold">
          Create an account
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
    gap: spacing.lg,
  },
  altRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
