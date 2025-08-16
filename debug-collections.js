#!/usr/bin/env node

/**
 * Debug script to test collection creation and fetching
 * This will help identify where the issue is occurring
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugCollections() {
  try {
    console.log('🔍 Starting collection debug...');
    console.log('📊 Supabase URL:', supabaseUrl);
    console.log('🔑 Anon Key length:', supabaseAnonKey?.length || 0);
    
    // Test 1: Check if we can connect to Supabase
    console.log('\n🧪 Test 1: Testing Supabase connection...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ Auth error:', authError);
      return;
    }
    
    if (!user) {
      console.log('⚠️  No authenticated user found');
      console.log('💡 You need to sign in first to test collections');
      return;
    }
    
    console.log('✅ Connected to Supabase as user:', user.id);
    
    // Test 2: Check collections table structure
    console.log('\n🧪 Test 2: Checking collections table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'collections')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.error('❌ Table info error:', tableError);
    } else {
      console.log('📋 Collections table columns:');
      tableInfo.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
    // Test 3: Check RLS policies
    console.log('\n🧪 Test 3: Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .from('information_schema.policies')
      .select('policy_name, action, definition')
      .eq('table_name', 'collections')
      .eq('table_schema', 'public');
    
    if (policyError) {
      console.error('❌ Policy info error:', policyError);
    } else {
      console.log('🔒 RLS Policies:');
      policies.forEach(policy => {
        console.log(`   - ${policy.policy_name}: ${policy.action}`);
        console.log(`     Definition: ${policy.definition}`);
      });
    }
    
    // Test 4: Try to fetch collections
    console.log('\n🧪 Test 4: Testing collection fetch...');
    const { data: collections, error: fetchError } = await supabase
      .from('collections')
      .select('*')
      .eq('user_id', user.id);
    
    if (fetchError) {
      console.error('❌ Collection fetch error:', fetchError);
      console.log('💡 This might be an RLS policy issue');
    } else {
      console.log(`✅ Found ${collections?.length || 0} collections for user`);
      if (collections && collections.length > 0) {
        console.log('📝 Sample collection:', {
          id: collections[0].id,
          status: collections[0].status,
          hasEncryptedName: !!collections[0].name_encrypted,
          hasHash: !!collections[0].name_hash,
          createdAt: collections[0].created_at
        });
      }
    }
    
    // Test 5: Check if we can insert a test collection
    console.log('\n🧪 Test 5: Testing collection insertion...');
    const testCollection = {
      id: `test-${Date.now()}`,
      user_id: user.id,
      name_encrypted: 'test-encrypted-name',
      name_hash: 'test-hash',
      status: 'active'
    };
    
    const { data: inserted, error: insertError } = await supabase
      .from('collections')
      .insert([testCollection])
      .select();
    
    if (insertError) {
      console.error('❌ Collection insert error:', insertError);
      console.log('💡 This might be an RLS policy or constraint issue');
    } else {
      console.log('✅ Test collection inserted successfully');
      
      // Clean up test collection
      const { error: deleteError } = await supabase
        .from('collections')
        .delete()
        .eq('id', testCollection.id);
      
      if (deleteError) {
        console.log('⚠️  Could not clean up test collection:', deleteError);
      } else {
        console.log('🧹 Test collection cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug function
debugCollections().then(() => {
  console.log('\n🏁 Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('❌ Debug failed:', error);
  process.exit(1);
});
