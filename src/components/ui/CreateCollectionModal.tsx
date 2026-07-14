import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    FlatList,
    Modal,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../theme';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store/useAppStore';
import { UserCollection } from '../../types';
import { Button } from './Button';
import { CinematicModal } from '../layout/CinematicModal';
import { Image } from 'expo-image';

interface CreateCollectionModalProps {
    visible: boolean;
    onClose: () => void;
    collectionToEdit?: UserCollection;
}

const PRESET_EMOJIS = ['📂', '🍿', '🌟', '💖', '🍿', '🔥', '📚', '😭', '🌸', '⚔️', '🤖', '🎮', '🎭', '🍀', '🍕', '🎉'];

const PRESET_COVERS = [
    { id: '', name: 'Default Grid Collage', url: '' },
    { id: 'cyberpunk', name: 'Cyberpunk Red', url: 'https://images.unsplash.com/photo-1578632738908-48c104e8d89e?q=80&w=600' },
    { id: 'neon', name: 'Neon Arcade', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600' },
    { id: 'blossom', name: 'Sakura Petals', url: 'https://images.unsplash.com/photo-1522441815192-d9f04eb0615c?q=80&w=600' },
    { id: 'pixels', name: 'Retro Grid', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600' },
    { id: 'sky', name: 'Anime Sunset', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600' }
];

export const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({
    visible,
    onClose,
    collectionToEdit
}) => {
    const themeColors = useThemeColors();
    const createCollectionAction = useAppStore(state => state.createCollectionAction);
    const updateCollectionAction = useAppStore(state => state.updateCollectionAction);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('📂');
    const [selectedCover, setSelectedCover] = useState('');
    const [errorStatus, setErrorStatus] = useState('');

    // Hydrate fields if editing
    useEffect(() => {
        if (collectionToEdit) {
            setName(collectionToEdit.name);
            setDescription(collectionToEdit.description || '');
            setSelectedEmoji(collectionToEdit.emoji || '📂');
            setSelectedCover(collectionToEdit.coverImage || '');
        } else {
            setName('');
            setDescription('');
            setSelectedEmoji('📂');
            setSelectedCover('');
        }
        setErrorStatus('');
    }, [collectionToEdit, visible]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            setErrorStatus('Collection name is required.');
            return;
        }

        try {
            if (collectionToEdit) {
                await updateCollectionAction(collectionToEdit.id, {
                    name: name.trim(),
                    description: description.trim(),
                    emoji: selectedEmoji,
                    coverImage: selectedCover
                });
            } else {
                await createCollectionAction(
                    name.trim(),
                    description.trim(),
                    selectedEmoji,
                    selectedCover
                );
            }
            onClose();
        } catch (e) {
            setErrorStatus('Failed to save collection.');
        }
    };

    return (
        <CinematicModal
            visible={visible}
            onClose={onClose}
            maxWidth={360}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.container}
            >
                <Text style={[styles.headerTitle, { color: 'white' }]}>
                    {collectionToEdit ? 'Edit Collection' : 'Create Collection'}
                </Text>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                    {/* Collection Name */}
                    <Text style={[styles.inputLabel, { color: themeColors.textDim }]}>COLLECTION NAME</Text>
                    <TextInput
                        placeholder="e.g. Masterpieces, Weekend Binge..."
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        value={name}
                        onChangeText={(text) => {
                            setName(text);
                            setErrorStatus('');
                        }}
                        style={[
                            styles.input,
                            {
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                borderColor: errorStatus ? '#FF3B30' : 'rgba(255, 255, 255, 0.06)'
                            }
                        ]}
                    />
                    {errorStatus ? <Text style={styles.errorText}>{errorStatus}</Text> : null}

                    {/* Description */}
                    <Text style={[styles.inputLabel, { color: themeColors.textDim, marginTop: spacing.md }]}>DESCRIPTION (OPTIONAL)</Text>
                    <TextInput
                        placeholder="Add context to this watch list..."
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                        style={[
                            styles.input,
                            styles.textArea,
                            {
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                borderColor: 'rgba(255, 255, 255, 0.06)',
                                textAlignVertical: 'top'
                            }
                        ]}
                    />

                    {/* Emoji Selector */}
                    <Text style={[styles.inputLabel, { color: themeColors.textDim, marginTop: spacing.md }]}>SELECT EMOJI</Text>
                    <View style={styles.emojiGrid}>
                        {PRESET_EMOJIS.map((emoji) => (
                            <TouchableOpacity
                                key={emoji}
                                onPress={() => setSelectedEmoji(emoji)}
                                style={[
                                    styles.emojiBubble,
                                    {
                                        backgroundColor: selectedEmoji === emoji ? `${themeColors.primary}30` : 'rgba(255,255,255,0.03)',
                                        borderColor: selectedEmoji === emoji ? themeColors.primary : 'transparent'
                                    }
                                ]}
                            >
                                <Text style={styles.emojiText}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Cover Selector */}
                    <Text style={[styles.inputLabel, { color: themeColors.textDim, marginTop: spacing.md }]}>SELECT COVER STYLE</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.coverRow}
                    >
                        {PRESET_COVERS.map((cover) => (
                            <TouchableOpacity
                                key={cover.id}
                                onPress={() => setSelectedCover(cover.url)}
                                style={[
                                    styles.coverCard,
                                    {
                                        borderColor: selectedCover === cover.url ? themeColors.primary : 'rgba(255,255,255,0.06)',
                                        backgroundColor: 'rgba(255,255,255,0.02)'
                                    }
                                ]}
                            >
                                {cover.url ? (
                                    <Image source={{ uri: cover.url }} style={styles.coverImage} contentFit="cover" />
                                ) : (
                                    <View style={styles.folderIconPlaceholder}>
                                        <Feather name="folder" size={24} color={themeColors.textDim} />
                                    </View>
                                )}
                                <View style={styles.coverDetails}>
                                    <Text style={[styles.coverName, { color: 'white' }]} numberOfLines={1}>
                                        {cover.name}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </ScrollView>

                <View style={styles.buttonRow}>
                    <Button
                        title="Cancel"
                        variant="outline"
                        onPress={onClose}
                        style={styles.dialogBtn}
                    />
                    <Button
                        title={collectionToEdit ? 'Save Changes' : 'Create'}
                        variant="primary"
                        onPress={handleSubmit}
                        style={styles.dialogBtn}
                    />
                </View>
            </KeyboardAvoidingView>
        </CinematicModal>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: spacing.sm,
        gap: spacing.md,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    scroll: {
        maxHeight: 380,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderRadius: borderRadius.md,
        height: 46,
        paddingHorizontal: spacing.md,
        color: '#FFF',
        fontSize: 14,
    },
    textArea: {
        height: 80,
        paddingTop: spacing.sm,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: 4,
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginVertical: 4,
    },
    emojiBubble: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    emojiText: {
        fontSize: 18,
    },
    coverRow: {
        gap: spacing.sm,
        paddingVertical: 4,
    },
    coverCard: {
        width: 110,
        height: 90,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        overflow: 'hidden',
    },
    coverImage: {
        width: '100%',
        height: 60,
    },
    folderIconPlaceholder: {
        width: '100%',
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    coverDetails: {
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    coverName: {
        fontSize: 9,
        fontWeight: '700',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    dialogBtn: {
        flex: 1,
        height: 46,
    },
});
