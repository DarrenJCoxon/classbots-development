

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."concern_status" AS ENUM (
    'pending',
    'reviewing',
    'resolved',
    'false_positive'
);


ALTER TYPE "public"."concern_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'teacher',
    'student'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE NOTICE 'Error creating profile: %', SQLERRM;
    RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."moddatetime"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."moddatetime"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "message_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_id" "uuid",
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "tokens_used" integer,
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone,
    CONSTRAINT "chat_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chatbots" (
    "chatbot_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "system_prompt" "text" NOT NULL,
    "teacher_id" "uuid",
    "model" "text" DEFAULT 'gpt-3.5-turbo'::"text",
    "max_tokens" integer DEFAULT 1000,
    "temperature" numeric(3,2) DEFAULT 0.7,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "enable_rag" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."chatbots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."concern_flags" (
    "flag_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "message_id" "uuid",
    "room_id" "uuid",
    "student_id" "uuid",
    "teacher_id" "uuid",
    "concern_type" character varying(50) NOT NULL,
    "concern_level" integer NOT NULL,
    "message_content" "text" NOT NULL,
    "context_messages" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "status" character varying(20) DEFAULT 'pending'::character varying
);


ALTER TABLE "public"."concern_flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_chunks" (
    "chunk_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "chunk_text" "text" NOT NULL,
    "token_count" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "embedding_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."document_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "document_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "status" "text" DEFAULT 'uploaded'::"text" NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flagged_messages" (
    "flag_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "teacher_id" "uuid" NOT NULL,
    "room_id" "uuid" NOT NULL,
    "concern_type" "text" NOT NULL,
    "concern_level" integer NOT NULL,
    "analysis_explanation" "text",
    "context_messages" "jsonb",
    "status" "public"."concern_status" DEFAULT 'pending'::"public"."concern_status" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "reviewer_id" "uuid",
    CONSTRAINT "flagged_messages_concern_level_check" CHECK ((("concern_level" >= 0) AND ("concern_level" <= 5)))
);


ALTER TABLE "public"."flagged_messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."flagged_messages"."concern_type" IS 'Category of concern identified (e.g., self_harm, bullying)';



COMMENT ON COLUMN "public"."flagged_messages"."concern_level" IS 'Severity rating from 0 (none) to 5 (critical)';



COMMENT ON COLUMN "public"."flagged_messages"."analysis_explanation" IS 'Explanation provided by the analysis model (e.g., OpenAI)';



COMMENT ON COLUMN "public"."flagged_messages"."context_messages" IS 'Snapshot of surrounding messages at the time of flagging (optional)';



COMMENT ON COLUMN "public"."flagged_messages"."status" IS 'Current review status of the flagged message';



COMMENT ON COLUMN "public"."flagged_messages"."notes" IS 'Notes added by the reviewing teacher';



COMMENT ON COLUMN "public"."flagged_messages"."reviewed_at" IS 'Timestamp when the flag was last reviewed/status changed';



COMMENT ON COLUMN "public"."flagged_messages"."reviewer_id" IS 'User ID of the teacher who last reviewed/updated the status';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "school_id" "uuid",
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_chatbots" (
    "room_id" "uuid" NOT NULL,
    "chatbot_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."room_chatbots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."room_memberships" (
    "room_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."room_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "room_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "room_name" "text" NOT NULL,
    "room_code" "text" NOT NULL,
    "teacher_id" "uuid",
    "school_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schools" (
    "school_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "magic_link_token" "text",
    "token_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("message_id");



ALTER TABLE ONLY "public"."chatbots"
    ADD CONSTRAINT "chatbots_pkey" PRIMARY KEY ("chatbot_id");



ALTER TABLE ONLY "public"."concern_flags"
    ADD CONSTRAINT "concern_flags_pkey" PRIMARY KEY ("flag_id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("chunk_id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("document_id");



ALTER TABLE ONLY "public"."flagged_messages"
    ADD CONSTRAINT "flagged_messages_pkey" PRIMARY KEY ("flag_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."room_chatbots"
    ADD CONSTRAINT "room_chatbots_pkey" PRIMARY KEY ("room_id", "chatbot_id");



ALTER TABLE ONLY "public"."room_memberships"
    ADD CONSTRAINT "room_memberships_pkey" PRIMARY KEY ("room_id", "student_id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("room_id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_room_code_key" UNIQUE ("room_code");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("school_id");



CREATE INDEX "idx_chat_messages_room_id" ON "public"."chat_messages" USING "btree" ("room_id");



CREATE INDEX "idx_chatbots_teacher_id" ON "public"."chatbots" USING "btree" ("teacher_id");



CREATE INDEX "idx_document_chunks_document_id" ON "public"."document_chunks" USING "btree" ("document_id");



CREATE INDEX "idx_documents_chatbot_id" ON "public"."documents" USING "btree" ("chatbot_id");



CREATE INDEX "idx_flagged_messages_message_id" ON "public"."flagged_messages" USING "btree" ("message_id");



CREATE INDEX "idx_flagged_messages_status" ON "public"."flagged_messages" USING "btree" ("status");



CREATE INDEX "idx_flagged_messages_student_id" ON "public"."flagged_messages" USING "btree" ("student_id");



CREATE INDEX "idx_flagged_messages_teacher_id" ON "public"."flagged_messages" USING "btree" ("teacher_id");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_school_id" ON "public"."profiles" USING "btree" ("school_id");



CREATE INDEX "idx_room_memberships_student_id" ON "public"."room_memberships" USING "btree" ("student_id");



CREATE INDEX "idx_rooms_room_code" ON "public"."rooms" USING "btree" ("room_code");



CREATE INDEX "idx_rooms_school_id" ON "public"."rooms" USING "btree" ("school_id");



CREATE INDEX "idx_rooms_teacher_id" ON "public"."rooms" USING "btree" ("teacher_id");



CREATE OR REPLACE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."flagged_messages" FOR EACH ROW EXECUTE FUNCTION "public"."moddatetime"();



CREATE OR REPLACE TRIGGER "update_chatbots_updated_at" BEFORE UPDATE ON "public"."chatbots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rooms_updated_at" BEFORE UPDATE ON "public"."rooms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_schools_updated_at" BEFORE UPDATE ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("room_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chatbots"
    ADD CONSTRAINT "chatbots_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."concern_flags"
    ADD CONSTRAINT "concern_flags_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("message_id");



ALTER TABLE ONLY "public"."concern_flags"
    ADD CONSTRAINT "concern_flags_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."concern_flags"
    ADD CONSTRAINT "concern_flags_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("room_id");



ALTER TABLE ONLY "public"."concern_flags"
    ADD CONSTRAINT "concern_flags_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."concern_flags"
    ADD CONSTRAINT "concern_flags_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("user_id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("document_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("chatbot_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flagged_messages"
    ADD CONSTRAINT "flagged_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("message_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flagged_messages"
    ADD CONSTRAINT "flagged_messages_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("user_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."flagged_messages"
    ADD CONSTRAINT "flagged_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("room_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flagged_messages"
    ADD CONSTRAINT "flagged_messages_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flagged_messages"
    ADD CONSTRAINT "flagged_messages_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("school_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_chatbots"
    ADD CONSTRAINT "room_chatbots_chatbot_id_fkey" FOREIGN KEY ("chatbot_id") REFERENCES "public"."chatbots"("chatbot_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_chatbots"
    ADD CONSTRAINT "room_chatbots_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("room_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_memberships"
    ADD CONSTRAINT "room_memberships_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("room_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."room_memberships"
    ADD CONSTRAINT "room_memberships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("school_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



CREATE POLICY "Allow inserting flags from any authenticated user" ON "public"."flagged_messages" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Students can insert messages in rooms they're part of" ON "public"."chat_messages" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."room_memberships"
  WHERE (("room_memberships"."room_id" = "chat_messages"."room_id") AND ("room_memberships"."student_id" = "auth"."uid"()))))));



CREATE POLICY "Students can read chatbots in their rooms" ON "public"."chatbots" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."room_chatbots"
     JOIN "public"."room_memberships" ON (("room_chatbots"."room_id" = "room_memberships"."room_id")))
  WHERE (("room_chatbots"."chatbot_id" = "chatbots"."chatbot_id") AND ("room_memberships"."student_id" = "auth"."uid"())))));



CREATE POLICY "Students can read room_chatbots for their rooms" ON "public"."room_chatbots" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."room_memberships"
  WHERE (("room_memberships"."room_id" = "room_chatbots"."room_id") AND ("room_memberships"."student_id" = "auth"."uid"())))));



CREATE POLICY "Students can view their own memberships" ON "public"."room_memberships" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "TEMP Allow Anon to Insert Flags" ON "public"."flagged_messages" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "TEMP Allow Service Role to Insert Flags" ON "public"."flagged_messages" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Teachers can create chatbots" ON "public"."chatbots" FOR INSERT WITH CHECK (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Teachers can delete their own chatbots" ON "public"."chatbots" FOR DELETE USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Teachers can manage room_chatbots for their rooms" ON "public"."room_chatbots" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."room_id" = "room_chatbots"."room_id") AND ("rooms"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can manage their own chatbots" ON "public"."chatbots" TO "authenticated" USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Teachers can update their flags" ON "public"."flagged_messages" FOR UPDATE USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can update their own chatbots" ON "public"."chatbots" FOR UPDATE USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Teachers can view memberships of their rooms" ON "public"."room_memberships" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."room_id" = "room_memberships"."room_id") AND ("rooms"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "Teachers can view their flags" ON "public"."flagged_messages" FOR SELECT USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teachers can view their own chatbots" ON "public"."chatbots" FOR SELECT USING (("teacher_id" = "auth"."uid"()));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view messages in rooms they're part of" ON "public"."chat_messages" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."room_memberships"
  WHERE (("room_memberships"."room_id" = "chat_messages"."room_id") AND ("room_memberships"."student_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."room_id" = "chat_messages"."room_id") AND ("rooms"."teacher_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "allow_insert_profiles" ON "public"."profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "allow_select_profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "allow_teachers_insert_rooms" ON "public"."rooms" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow_teachers_select_rooms" ON "public"."rooms" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_teachers_update_rooms" ON "public"."rooms" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "allow_update_profiles" ON "public"."profiles" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "chat_messages_insert" ON "public"."chat_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."room_id" = "chat_messages"."room_id") AND (("rooms"."teacher_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."room_memberships"
          WHERE (("room_memberships"."room_id" = "rooms"."room_id") AND ("room_memberships"."student_id" = "auth"."uid"())))))))));



CREATE POLICY "chat_messages_read" ON "public"."chat_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."room_id" = "chat_messages"."room_id") AND (("rooms"."teacher_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."room_memberships"
          WHERE (("room_memberships"."room_id" = "rooms"."room_id") AND ("room_memberships"."student_id" = "auth"."uid"())))))))));



ALTER TABLE "public"."chatbots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "chatbots_teacher_insert" ON "public"."chatbots" FOR INSERT WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "chatbots_teacher_read" ON "public"."chatbots" FOR SELECT USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "chatbots_teacher_update" ON "public"."chatbots" FOR UPDATE USING (("auth"."uid"() = "teacher_id")) WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "chunks_delete_policy" ON "public"."document_chunks" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."documents"
     JOIN "public"."chatbots" ON (("documents"."chatbot_id" = "chatbots"."chatbot_id")))
  WHERE (("document_chunks"."document_id" = "documents"."document_id") AND ("chatbots"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "chunks_insert_policy" ON "public"."document_chunks" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."documents"
     JOIN "public"."chatbots" ON (("documents"."chatbot_id" = "chatbots"."chatbot_id")))
  WHERE (("document_chunks"."document_id" = "documents"."document_id") AND ("chatbots"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "chunks_select_policy" ON "public"."document_chunks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."documents"
     JOIN "public"."chatbots" ON (("documents"."chatbot_id" = "chatbots"."chatbot_id")))
  WHERE (("document_chunks"."document_id" = "documents"."document_id") AND ("chatbots"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "chunks_update_policy" ON "public"."document_chunks" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."documents"
     JOIN "public"."chatbots" ON (("documents"."chatbot_id" = "chatbots"."chatbot_id")))
  WHERE (("document_chunks"."document_id" = "documents"."document_id") AND ("chatbots"."teacher_id" = "auth"."uid"())))));



ALTER TABLE "public"."document_chunks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "document_chunks_teacher_policy" ON "public"."document_chunks" USING ((EXISTS ( SELECT 1
   FROM ("public"."documents"
     JOIN "public"."chatbots" ON (("documents"."chatbot_id" = "chatbots"."chatbot_id")))
  WHERE (("document_chunks"."document_id" = "documents"."document_id") AND ("chatbots"."teacher_id" = "auth"."uid"())))));



ALTER TABLE "public"."documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "documents_delete_policy" ON "public"."documents" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."chatbot_id" = "documents"."chatbot_id") AND ("chatbots"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "documents_insert_policy" ON "public"."documents" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."chatbot_id" = "documents"."chatbot_id") AND ("chatbots"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "documents_select_policy" ON "public"."documents" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."chatbot_id" = "documents"."chatbot_id") AND ("chatbots"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "documents_update_policy" ON "public"."documents" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chatbots"
  WHERE (("chatbots"."chatbot_id" = "documents"."chatbot_id") AND ("chatbots"."teacher_id" = "auth"."uid"())))));



CREATE POLICY "enable_insert_for_all_users" ON "public"."flagged_messages" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."flagged_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."room_chatbots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "room_memberships_insert" ON "public"."room_memberships" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "room_memberships_read" ON "public"."room_memberships" FOR SELECT USING (("auth"."uid"() = "student_id"));



ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teachers_can_manage_room_chatbots" ON "public"."room_chatbots" USING ((EXISTS ( SELECT 1
   FROM "public"."rooms"
  WHERE (("rooms"."room_id" = "room_chatbots"."room_id") AND ("rooms"."teacher_id" = "auth"."uid"())))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_messages";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."moddatetime"() TO "anon";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chatbots" TO "anon";
GRANT ALL ON TABLE "public"."chatbots" TO "authenticated";
GRANT ALL ON TABLE "public"."chatbots" TO "service_role";



GRANT ALL ON TABLE "public"."concern_flags" TO "anon";
GRANT ALL ON TABLE "public"."concern_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."concern_flags" TO "service_role";



GRANT ALL ON TABLE "public"."document_chunks" TO "anon";
GRANT ALL ON TABLE "public"."document_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."document_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."flagged_messages" TO "anon";
GRANT ALL ON TABLE "public"."flagged_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."flagged_messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."room_chatbots" TO "anon";
GRANT ALL ON TABLE "public"."room_chatbots" TO "authenticated";
GRANT ALL ON TABLE "public"."room_chatbots" TO "service_role";



GRANT ALL ON TABLE "public"."room_memberships" TO "anon";
GRANT ALL ON TABLE "public"."room_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."room_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
