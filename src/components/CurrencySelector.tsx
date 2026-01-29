import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
} from 'react-native';
import { Currency, CURRENCIES, searchCurrencies, DEFAULT_CURRENCY } from '../constants/currencies';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

interface CurrencySelectorProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (currency: Currency) => void;
    selectedCurrencyCode?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
    visible,
    onClose,
    onSelect,
    selectedCurrencyCode = 'USD',
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCurrencies, setFilteredCurrencies] = useState<Currency[]>(CURRENCIES);
    const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;

    // Filter currencies based on search
    useEffect(() => {
        const results = searchCurrencies(searchQuery);
        setFilteredCurrencies(results);
    }, [searchQuery]);

    // Animate modal in/out
    useEffect(() => {
        if (visible) {
            setSearchQuery('');
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: MODAL_HEIGHT,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, slideAnim, backdropAnim]);

    const handleSelect = (currency: Currency) => {
        Keyboard.dismiss();
        onSelect(currency);
        onClose();
    };

    const handleClose = () => {
        Keyboard.dismiss();
        onClose();
    };

    const renderCurrencyItem = ({ item }: { item: Currency }) => {
        const isSelected = item.code === selectedCurrencyCode;

        return (
            <TouchableOpacity
                style={[styles.currencyItem, isSelected && styles.currencyItemSelected]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
            >
                <Text style={styles.currencyFlag}>{item.flag}</Text>
                <View style={styles.currencyInfo}>
                    <Text style={[styles.currencyCode, isSelected && styles.currencyCodeSelected]}>
                        {item.code}
                    </Text>
                    <Text style={[styles.currencySymbol, isSelected && styles.currencySymbolSelected]}>
                        {item.symbol}
                    </Text>
                </View>
                {isSelected && (
                    <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                {/* Backdrop */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: backdropAnim },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.backdropTouchable}
                        onPress={handleClose}
                        activeOpacity={1}
                    />
                </Animated.View>

                {/* Bottom Sheet */}
                <Animated.View
                    style={[
                        styles.sheet,
                        { transform: [{ translateY: slideAnim }] },
                    ]}
                >
                    {/* Handle Bar */}
                    <View style={styles.handleContainer}>
                        <View style={styles.handle} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Currency</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <View style={styles.searchInputContainer}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by code (USD, INR, EUR...)"
                                placeholderTextColor="#666"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                returnKeyType="search"
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity
                                    onPress={() => setSearchQuery('')}
                                    style={styles.clearButton}
                                >
                                    <Text style={styles.clearText}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Currency List */}
                    <FlatList
                        data={filteredCurrencies}
                        keyExtractor={(item) => item.code}
                        renderItem={renderCurrencyItem}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyIcon}>🔍</Text>
                                <Text style={styles.emptyText}>
                                    No currencies found for "{searchQuery}"
                                </Text>
                            </View>
                        }
                    />
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// Inline currency picker button for forms
interface CurrencyPickerButtonProps {
    currencyCode: string;
    onPress: () => void;
}

export const CurrencyPickerButton: React.FC<CurrencyPickerButtonProps> = ({
    currencyCode,
    onPress,
}) => {
    const currency = CURRENCIES.find(c => c.code === currencyCode) || DEFAULT_CURRENCY;

    return (
        <TouchableOpacity
            style={styles.pickerButton}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={styles.pickerFlag}>{currency.flag}</Text>
            <Text style={styles.pickerSymbol}>{currency.symbol}</Text>
            <Text style={styles.pickerDropdown}>▾</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    backdropTouchable: {
        flex: 1,
    },
    sheet: {
        height: MODAL_HEIGHT,
        backgroundColor: '#1C1C1E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    handleContainer: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 8,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#3A3A3C',
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#2C2C2E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        fontSize: 16,
        color: '#8E8E93',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2C2C2E',
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#FFFFFF',
        paddingVertical: 12,
    },
    clearButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#3A3A3C',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearText: {
        fontSize: 12,
        color: '#8E8E93',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    currencyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#252528',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#2C2C2E',
    },
    currencyItemSelected: {
        backgroundColor: '#0A3D62',
        borderColor: '#007AFF',
    },
    currencyFlag: {
        fontSize: 28,
        marginRight: 14,
    },
    currencyInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    currencyCode: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    currencyCodeSelected: {
        color: '#4DA3FF',
    },
    currencySymbol: {
        fontSize: 18,
        fontWeight: '600',
        color: '#8E8E93',
    },
    currencySymbolSelected: {
        color: '#7FBFFF',
    },
    checkmark: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmarkText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 15,
        color: '#8E8E93',
        textAlign: 'center',
    },
    // Picker Button Styles
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 8,
        paddingVertical: 14,
        borderRightWidth: 1,
        borderRightColor: '#2C2C2E',
        gap: 6,
    },
    pickerFlag: {
        fontSize: 20,
    },
    pickerSymbol: {
        fontSize: 18,
        fontWeight: '600',
        color: '#007AFF',
    },
    pickerDropdown: {
        fontSize: 10,
        color: '#8E8E93',
    },
});
