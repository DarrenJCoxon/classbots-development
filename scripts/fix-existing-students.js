// scripts/fix-existing-students.js
const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or replace with your values
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixExistingStudents() {
  try {
    console.log('Fetching students without credentials...');
    
    // Get students without username or PIN
    const { data: studentsToFix, error: fetchError } = await supabase
      .from('student_profiles')
      .select('user_id, full_name, first_name, surname, username, pin_code')
      .or('username.is.null,pin_code.is.null');
      
    if (fetchError) {
      console.error('Error fetching students:', fetchError);
      return;
    }
    
    console.log(`Found ${studentsToFix.length} students to fix`);
    
    for (const student of studentsToFix) {
      console.log(`\nProcessing: ${student.full_name || 'Unknown'}`);
      
      // Generate username if missing
      let username = student.username;
      if (!username) {
        const firstName = student.first_name || student.full_name?.split(' ')[0] || 'student';
        const surname = student.surname || student.full_name?.split(' ')[1] || 'user';
        
        // Create base username
        const baseUsername = `${firstName}.${surname}`.toLowerCase().replace(/[^a-z.]/g, '');
        
        // Check if username exists
        const { data: existing } = await supabase
          .from('student_profiles')
          .select('username')
          .eq('username', baseUsername)
          .single();
          
        username = existing ? `${baseUsername}${Math.floor(Math.random() * 900) + 100}` : baseUsername;
      }
      
      // Generate PIN if missing
      const pinCode = student.pin_code || Math.floor(1000 + Math.random() * 9000).toString();
      
      // Update student profile
      const { error: updateError } = await supabase
        .from('student_profiles')
        .update({ 
          username, 
          pin_code: pinCode,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', student.user_id);
        
      if (updateError) {
        console.error(`Failed to update profile for ${student.full_name}:`, updateError);
        continue;
      }
      
      // Update auth password to match PIN
      const email = `${username}@student.classbots.local`;
      
      const { error: authError } = await supabase.auth.admin.updateUserById(
        student.user_id,
        { 
          email: email,
          password: pinCode,
          email_confirm: true
        }
      );
      
      if (authError) {
        console.error(`Failed to update auth for ${student.full_name}:`, authError);
        continue;
      }
      
      console.log(`✓ Fixed: ${student.full_name}`);
      console.log(`  Username: ${username}`);
      console.log(`  PIN: ${pinCode}`);
    }
    
    console.log('\nAll done!');
    
    // Show summary
    const { count } = await supabase
      .from('student_profiles')
      .select('*', { count: 'exact' })
      .or('username.is.null,pin_code.is.null');
      
    console.log(`\nRemaining students without credentials: ${count || 0}`);
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

// Run the script
fixExistingStudents();