import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import { getErrorMessage } from '../../api/client';
import { webnestApi } from '../../api/webnestApi';
import { showAlert } from '../../components/AppAlert';
import { FormInput } from '../../components/FormInput';
import { Text } from '../../components/Text';
import { colors } from '../../theme/colors';
import { radii, shadow, spacing } from '../../theme/spacing';
import { useAuth } from './AuthContext';

/** Profile row + password modal to turn fingerprint / face login on and off. */
export function BiometricToggle() {
  const auth = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  if (!auth.biometry) {
    return null;
  }

  const isFace = auth.biometry === 'face';
  const noun = isFace ? 'Face login' : 'Fingerprint login';
  const glyph = isFace ? 'face-recognition' : 'fingerprint';

  const onRowPress = () => {
    if (auth.biometricEnabled) {
      showAlert(`Turn off ${noun}?`, "You'll sign in with your email and password again.", [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: () => auth.disableBiometrics(),
        },
      ]);
    } else {
      setPassword('');
      setModalOpen(true);
    }
  };

  const confirmEnable = async () => {
    const email = auth.user?.email;
    if (!email || password.length < 1 || busy) {
      return;
    }
    setBusy(true);
    try {
      // Verify the password before storing it behind the biometric lock. This
      // is a plain check — it does not touch the live session.
      await webnestApi.login(email, password);
      const ok = await auth.enableBiometrics(email, password);
      setModalOpen(false);
      setPassword('');
      showAlert(
        ok ? 'All set' : "Couldn't enable it",
        ok
          ? `Use your ${isFace ? 'face' : 'fingerprint'} next time you sign in.`
          : 'Please try again.',
      );
    } catch (err) {
      showAlert('That password did not match', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={onRowPress}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <MCIcon name={glyph} size={19} color={colors.goldPrimary} />
        <Text variant="body" tone="primary" style={styles.label}>
          {noun}
        </Text>
        <View style={[styles.pill, auth.biometricEnabled && styles.pillOn]}>
          <Text
            variant="caption"
            tone={auth.biometricEnabled ? 'onGold' : 'tertiary'}
            style={styles.pillText}>
            {auth.biometricEnabled ? 'ON' : 'OFF'}
          </Text>
        </View>
      </Pressable>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setModalOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalOpen(false)} />
          <View style={styles.card}>
            <View style={styles.rule} />
            <Text variant="rowTitle" style={styles.cardTitle}>
              Confirm your password
            </Text>
            <Text variant="body" tone="secondary" style={styles.cardBody}>
              We store it behind your {isFace ? 'face' : 'fingerprint'} so you can skip typing it
              next time.
            </Text>
            <FormInput
              label="Password"
              secureTextEntry
              autoFocus
              value={password}
              onChangeText={setPassword}
            />
            <View style={styles.actions}>
              <Pressable onPress={() => setModalOpen(false)} style={styles.action}>
                <Text variant="button" tone="tertiary" style={styles.actionText}>
                  CANCEL
                </Text>
              </Pressable>
              <Pressable
                onPress={confirmEnable}
                disabled={busy || password.length < 1}
                style={[styles.action, (busy || password.length < 1) && styles.actionOff]}>
                {busy ? (
                  <ActivityIndicator size="small" color={colors.goldPrimary} />
                ) : (
                  <Text variant="button" tone="gold" style={styles.actionText}>
                    ENABLE
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  rowPressed: {
    opacity: 0.85,
  },
  label: {
    flex: 1,
  },
  pill: {
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillOn: {
    backgroundColor: colors.goldFill,
    borderColor: colors.goldFill,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.xl,
    borderWidth: 1,
    maxWidth: 400,
    padding: spacing.lg,
    width: '100%',
    ...shadow.card,
  },
  rule: {
    backgroundColor: colors.goldPrimary,
    borderRadius: radii.pill,
    height: 3,
    marginBottom: spacing.md,
    width: 34,
  },
  cardTitle: {
    marginBottom: spacing.xs,
  },
  cardBody: {
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
  action: {
    borderRadius: radii.sm,
    minWidth: 84,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionOff: {
    opacity: 0.4,
  },
  actionText: {
    fontSize: 13,
    letterSpacing: 1.2,
  },
});
