import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Icon from 'react-native-vector-icons/Feather';

import { getErrorMessage } from '../api/client';
import { webnestApi } from '../api/webnestApi';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { FormInput } from '../components/FormInput';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Text } from '../components/Text';
import { CONTACT } from '../data/content';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const schema = z.object({
  full_name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  phone_number: z.string().min(8, 'Enter a valid phone number'),
  project_type: z.string(),
  message: z.string().min(10, 'Tell us a little more'),
});

type FormValues = z.infer<typeof schema>;
const projectTypes = ['Website', 'AI Product', 'Full-Stack', 'Enterprise'];

export function ContactScreen() {
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, setValue, watch, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      phone_number: '',
      project_type: 'Website',
      message: '',
    },
  });
  const selectedType = watch('project_type');

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await webnestApi.submitLead({ ...values, source: 'contact_form', consent_given: true });
      reset();
      Alert.alert('Request received', 'WebNest Studio will reply within one business day.');
    } catch (error) {
      Alert.alert('Could not submit', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <SectionHeader
        eyebrow="Contact"
        title="Start a project"
        description="Tell us what you're building. We reply within one business day with a plan and a timeline."
      />

      <View style={styles.quickRow}>
        <Card onPress={() => Linking.openURL(CONTACT.whatsappHref)} style={styles.quick}>
          <Icon name="message-circle" size={18} color={colors.goldPrimary} />
          <Text variant="caption" tone="secondary">
            WhatsApp
          </Text>
        </Card>
        <Card onPress={() => Linking.openURL(CONTACT.phoneHref)} style={styles.quick}>
          <Icon name="phone" size={18} color={colors.goldPrimary} />
          <Text variant="caption" tone="secondary">
            Call
          </Text>
        </Card>
        <Card onPress={() => Linking.openURL(CONTACT.emailHref)} style={styles.quick}>
          <Icon name="mail" size={18} color={colors.goldPrimary} />
          <Text variant="caption" tone="secondary">
            Email
          </Text>
        </Card>
      </View>

      <Card variant="elevated" style={styles.form}>
        <Controller
          control={control}
          name="full_name"
          render={({ field }) => (
            <FormInput label="Name" value={field.value} onChangeText={field.onChange} error={formState.errors.full_name?.message} />
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
        <View>
          <Text variant="label" style={styles.chipLabel}>
            Project type
          </Text>
          <View style={styles.chips}>
            {projectTypes.map(t => (
              <Chip
                key={t}
                label={t}
                selected={selectedType === t}
                onPress={() => setValue('project_type', t)}
              />
            ))}
          </View>
        </View>
        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <FormInput
              label="Message"
              multiline
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.message?.message}
            />
          )}
        />
        <Button title="Submit query" icon="send" loading={loading} onPress={handleSubmit(onSubmit)} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quick: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  chipLabel: {
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
