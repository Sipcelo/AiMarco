import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar, Card, Divider, Button, TextInput, Snackbar, Portal } from 'react-native-paper';
import { useAuth } from '../src/contexts/AuthContext';
import { BACKEND_URL, updateProfile } from '../src/services/api';

const BUSINESS_LABELS = {
  barbershop: 'Barbeiro',
  nails: 'Manicure/Pedicure',
  hair: 'Cabelereiro',
};

const BUSINESS_OPTIONS: { id: 'barbershop' | 'nails' | 'hair'; label: string }[] = [
  { id: 'barbershop', label: 'Barbeiro' },
  { id: 'hair', label: 'Cabelereiro' },
  { id: 'nails', label: 'Manicure/Pedicure' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, updateUser, signOut } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [phone] = useState(user?.phone ?? '');
  const [selectedBusiness, setSelectedBusiness] = useState<'barbershop' | 'nails' | 'hair'>(
    user?.business_type ?? 'barbershop'
  );
  const [saving, setSaving] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const professionalId = useMemo(() => user?.id, [user]);

  const handleShare = async () => {
    if (!user?.slug) {
      Alert.alert('Erro', 'Slug não disponível.');
      return;
    }
    try {
      const shareUrl = `${BACKEND_URL}/p/${user.slug}`;
      await Share.share({
        message: `Agende seu horário comigo no AiMarco: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (e) {
      console.error('Share error', e);
      Alert.alert('Erro', 'Não foi possível compartilhar.');
    }
  };

  const handleSave = async () => {
    if (!displayName.trim() || !token || !professionalId) {
      Alert.alert('Erro', 'Preencha o nome e certifique-se de estar conectado.');
      return;
    }
    setSaving(true);
    try {
      const updatedUser = await updateProfile(token, professionalId, {
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        business_type: selectedBusiness,
      });
      // Merge backend response with existing user data
      updateUser({
        ...user!,
        ...updatedUser,
        email: user!.email,
        phone: user!.phone,
        full_name: user!.full_name,
        business_type: selectedBusiness,
        created_at: user!.created_at,
      } as any);
      Vibration.vibrate(30); // quick pulse confirming save
      setSnackbarVisible(true);
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meu Perfil</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Avatar & Identity */}
        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Avatar.Text
              size={80}
              label={getInitials(displayName)}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
            <TextInput
              label="Nome"
              mode="outlined"
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.nameInput}
            />
            <TextInput
              label="Bio (opcional)"
              mode="outlined"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              style={styles.bioInput}
            />
          </Card.Content>
        </Card>

        {/* Business Info */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text style={styles.sectionTitle}>Tipo de Negócio</Text>
            <View style={styles.businessRow}>
              {BUSINESS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.businessChip,
                    selectedBusiness === opt.id && styles.businessChipActive,
                  ]}
                  onPress={() => setSelectedBusiness(opt.id)}
                >
                  <Text
                    style={[
                      styles.businessChipText,
                      selectedBusiness === opt.id && styles.businessChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Divider style={styles.divider} />
            <InfoItem label="Email" value={user.email} />
            <Divider style={styles.divider} />
            <InfoItem label="Telefone" value={phone} />
            <Divider style={styles.divider} />
            <InfoItem label="Slug" value={`aimarco.com.br/p/${user.slug}`} />
          </Card.Content>
        </Card>

        {/* Public Profile Link */}
        <Button
          mode="outlined"
          icon="share-variant"
          onPress={handleShare}
          style={styles.shareButton}
          contentStyle={styles.shareButtonContent}
        >
          Compartilhar Perfil Público
        </Button>

        <Button
          mode="outlined"
          icon="logout"
          onPress={() =>
            Alert.alert('Sair', 'Deseja encerrar a sessão?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sair', style: 'destructive', onPress: signOut },
            ])
          }
          style={styles.logoutButton}
          contentStyle={styles.shareButtonContent}
          textColor="#DC2626"
        >
          Sair da conta
        </Button>
      </ScrollView>

      {/* Sticky Save Button */}
      <Button
        mode="contained"
        icon="content-save"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveBtn}
      >
        Salvar
      </Button>

      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={Snackbar.DURATION_MEDIUM}
          style={styles.snackbar}
        >
          Perfil atualizado com sucesso!
        </Snackbar>
      </Portal>
    </View>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: { padding: 8 },
  backButtonText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  placeholder: { width: 60 },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardContent: { padding: 20, alignItems: 'center' },
  avatar: { marginBottom: 12, backgroundColor: '#007AFF' },
  avatarLabel: { fontSize: 24, fontWeight: '700', color: '#fff' },
  nameInput: { width: '100%', marginTop: 8 },
  bioInput: { width: '100%', marginTop: 8, minHeight: 72 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
  },
  businessRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 4 },
  businessChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  businessChipActive: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  businessChipText: { fontSize: 13, fontWeight: '500', color: '#495057' },
  businessChipTextActive: { color: '#fff' },
  divider: { marginVertical: 12 },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  infoValue: { fontSize: 14, color: '#111', fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 },
  shareButton: { borderRadius: 10 },
  logoutButton: { borderRadius: 10, marginTop: 8, borderColor: '#DC2626' },
  shareButtonContent: { paddingVertical: 8 },
  saveBtn: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    margin: 16,
    borderRadius: 12,
    paddingVertical: 4,
  },
  snackbar: { bottom: 80 },
});
