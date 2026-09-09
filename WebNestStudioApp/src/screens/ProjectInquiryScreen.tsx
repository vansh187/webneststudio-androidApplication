import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation } from '@react-navigation/native';

import { getErrorMessage } from '../api/client';
import { webnestApi } from '../api/webnestApi';
import { showAlert } from '../components/AppAlert';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FormInput } from '../components/FormInput';
import { Screen } from '../components/Screen';
import { SectionHeader } from '../components/SectionHeader';
import { Select } from '../components/Select';
import { spacing } from '../theme/spacing';

const BUDGET_OPTIONS = [
  'Less than ₹50,000',
  '₹50,000 – ₹1,00,000',
  '₹1,00,000 and above',
] as const;

const schema = z.object({
  full_name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  phone_number: z.string().min(8, 'Enter a valid phone number'),
  project_type: z.string().min(2, 'Tell us the type of project'),
  budget_range: z.string().min(1, 'Choose a budget range'),
  message: z.string().min(10, 'Tell us a little more'),
});

type FormValues = z.infer<typeof schema>;

export function ProjectInquiryScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const { control, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      phone_number: '',
      project_type: '',
      budget_range: '',
      message: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await webnestApi.submitLead({
        ...values,
        source: 'start_project',
        consent_given: true,
      });
      reset();
      showAlert('Project request sent', 'WebNest Studio will reply within one business day.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      showAlert('Could not submit', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <SectionHeader
        eyebrow="Start a project"
        title="Tell us what you're building"
        description="Share the shape of the work and your budget. We reply within one business day with a plan and a timeline."
      />

      <Card variant="elevated" style={styles.form}>
        <Controller
          control={control}
          name="full_name"
          render={({ field }) => (
            <FormInput
              label="Name"
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
          name="project_type"
          render={({ field }) => (
            <FormInput
              label="Type of project"
              placeholder="Website, mobile app, AI product…"
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.project_type?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="budget_range"
          render={({ field }) => (
            <Select
              label="Budget range"
              placeholder="Choose a range"
              options={BUDGET_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              error={formState.errors.budget_range?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="message"
          render={({ field }) => (
            <FormInput
              label="Project details"
              multiline
              placeholder="Goals, timeline, anything we should know."
              value={field.value}
              onChangeText={field.onChange}
              error={formState.errors.message?.message}
            />
          )}
        />
        <Button
          title="Send project request"
          icon="arrow-right"
          loading={loading}
          onPress={handleSubmit(onSubmit)}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
});
