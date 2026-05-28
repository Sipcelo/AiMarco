import 'dotenv/config';
import { supabase } from '../src/lib/supabase.js';

async function test() {
  const { data, error } = await supabase.rpc('get_available_slots_v1', {
    p_professional_id: 'fce20330-7e39-4d2f-85bd-f60bb116b399', // dummy
    p_service_id: 'fce20330-7e39-4d2f-85bd-f60bb116b399',      // dummy
    p_date: '2026-03-26'
  });
  console.log(JSON.stringify(error, null, 2));
}

test();
