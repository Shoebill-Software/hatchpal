import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNestPalette } from '@/constants/nest';
import { Spacing } from '@/constants/theme';
import { silkieChickenConfig } from '@/data/species/chicken';
import { useActivePet } from '@/hooks/useActivePet';

export default function AdoptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const palette = useNestPalette();
  const { adoptPet } = useActivePet();
  const [nickname, setNickname] = useState('Pip');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    try {
      adoptPet(silkieChickenConfig.id, nickname);
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Adoption ist fehlgeschlagen.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View
        style={[
          styles.content,
          {
            paddingTop: Spacing.four,
            paddingBottom: insets.bottom + Spacing.four,
          },
        ]}>
        <Text style={[styles.title, { color: palette.text }]}>Ein Ei adoptieren</Text>
        <Text style={[styles.body, { color: palette.textMuted }]}>
          Starterart mit vollständigem Brutprofil. Die Inkubation läuft 1:1 in Echtzeit.
        </Text>

        <View
          style={[
            styles.speciesCard,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}>
          <Text style={[styles.speciesName, { color: palette.text }]}>
            {silkieChickenConfig.commonName}
          </Text>
          <Text style={[styles.scientific, { color: palette.textMuted }]}>
            {silkieChickenConfig.scientificName}
          </Text>
          <Text style={[styles.meta, { color: palette.textMuted }]}>
            {silkieChickenConfig.incubationDays} Tage · {silkieChickenConfig.temperatureTargetCelsius.toFixed(1)} °C ·{' '}
            {silkieChickenConfig.humidityTargetPct} % Luftfeuchte
          </Text>
        </View>

        <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>Spitzname</Text>
        <TextInput
          value={nickname}
          onChangeText={(value) => {
            setNickname(value);
            setError(null);
          }}
          maxLength={24}
          autoCorrect={false}
          placeholder="Name des Eis"
          placeholderTextColor={palette.textMuted}
          accessibilityLabel="Spitzname des Eis"
          style={[
            styles.input,
            {
              color: palette.text,
              backgroundColor: palette.surface,
              borderColor: error ? palette.warning : palette.border,
            },
          ]}
        />
        {error ? <Text style={[styles.error, { color: palette.warning }]}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={submit}
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: palette.action, opacity: pressed ? 0.86 : 1 },
          ]}>
          <Text style={[styles.submitLabel, { color: palette.actionText }]}>Ins Nest legen</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.two,
  },
  speciesCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: 4,
    marginBottom: Spacing.two,
  },
  speciesName: {
    fontSize: 20,
    fontWeight: '700',
  },
  scientific: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  meta: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    fontSize: 13,
    fontWeight: '600',
  },
  submit: {
    marginTop: Spacing.two,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
