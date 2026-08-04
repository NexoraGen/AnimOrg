import { Redirect, useLocalSearchParams } from 'expo-router';

export default function SharePostRedirect() {
    const { id } = useLocalSearchParams();

    // Transparently bounce the /share/post route to the primary /post route
    return <Redirect href={`/post/${id}`} />;
}
