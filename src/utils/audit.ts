import { supabase } from '@/integrations/supabase/client';

export async function logAction(action: string, entity?: string, entityId?: string, details?: any) {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from('audit_logs').insert({
            user_id: user?.id,
            action,
            entity,
            entity_id: entityId,
            details
        });
    } catch (e) {
        console.error('Audit skip:', e);
    }
}
