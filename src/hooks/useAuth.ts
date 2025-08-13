import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const session = supabase.auth.session();
        setUser(session?.user ?? null);
        setLoading(false);

        const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const signInWithGoogle = async () => {
        const { user, error } = await supabase.auth.signIn({ provider: 'google' });
        if (error) {
            console.error('Error signing in:', error.message);
        }
        return user;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error.message);
        }
    };

    return { user, loading, signInWithGoogle, signOut };
};

export default useAuth;