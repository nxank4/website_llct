"""enable_rls_and_policies

Revision ID: 945f583f7280
Revises: 0001_initial_schema
Create Date: 2025-11-12 18:43:24.311795

"""
from typing import Sequence, Union

from alembic import op


revision: str = "945f583f7280"
down_revision: Union[str, Sequence[str], None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _exec_if_table(table: str, statements: list[str]) -> None:
    """Execute each statement via EXECUTE only when the table exists."""
    escaped = [stmt.replace("'", "''") for stmt in statements]
    exec_lines = "\n            ".join(f"EXECUTE '{stmt}';" for stmt in escaped)
    op.execute(
        f"""
        DO $$
        BEGIN
            IF to_regclass('public."{table}"') IS NOT NULL THEN
                {exec_lines}
            END IF;
        END
        $$;
        """
    )


def upgrade() -> None:
    """Enable RLS and create default policies."""
    _exec_if_table(
        "profiles",
        [
            'ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS profiles_select_own ON public.profiles",
            "CREATE POLICY profiles_select_own ON public.profiles "
            "FOR SELECT USING (auth.uid() = id)",
            "DROP POLICY IF EXISTS profiles_update_own ON public.profiles",
            "CREATE POLICY profiles_update_own ON public.profiles "
            "FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id)",
        ],
    )

    _exec_if_table(
        "courses",
        [
            'ALTER TABLE public."courses" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS courses_select_policy ON public.courses",
            "CREATE POLICY courses_select_policy ON public.courses "
            "FOR SELECT USING (is_published = TRUE OR auth.uid() = instructor_id)",
            "DROP POLICY IF EXISTS courses_modify_policy ON public.courses",
            "CREATE POLICY courses_modify_policy ON public.courses "
            "FOR ALL USING (auth.uid() = instructor_id) WITH CHECK (auth.uid() = instructor_id)",
        ],
    )

    _exec_if_table(
        "lessons",
        [
            'ALTER TABLE public."lessons" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS lessons_select_policy ON public.lessons",
            "CREATE POLICY lessons_select_policy ON public.lessons FOR SELECT USING (TRUE)",
            "DROP POLICY IF EXISTS lessons_modify_policy ON public.lessons",
            "CREATE POLICY lessons_modify_policy ON public.lessons "
            "FOR ALL USING ("
            "    EXISTS ("
            "        SELECT 1 FROM public.courses "
            "        WHERE courses.id = lessons.course_id "
            "          AND auth.uid() = courses.instructor_id"
            "    )"
            ") WITH CHECK ("
            "    EXISTS ("
            "        SELECT 1 FROM public.courses "
            "        WHERE courses.id = lessons.course_id "
            "          AND auth.uid() = courses.instructor_id"
            "    )"
            ")",
        ],
    )

    _exec_if_table(
        "exercises",
        [
            'ALTER TABLE public."exercises" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS exercises_select_policy ON public.exercises",
            "CREATE POLICY exercises_select_policy ON public.exercises FOR SELECT USING (TRUE)",
            "DROP POLICY IF EXISTS exercises_modify_policy ON public.exercises",
            "CREATE POLICY exercises_modify_policy ON public.exercises "
            "FOR ALL USING ("
            "    EXISTS ("
            "        SELECT 1 FROM public.lessons "
            "        JOIN public.courses ON courses.id = lessons.course_id "
            "       WHERE lessons.id = exercises.lesson_id "
            "         AND auth.uid() = courses.instructor_id"
            "    )"
            ") WITH CHECK ("
            "    EXISTS ("
            "        SELECT 1 FROM public.lessons "
            "        JOIN public.courses ON courses.id = lessons.course_id "
            "       WHERE lessons.id = exercises.lesson_id "
            "         AND auth.uid() = courses.instructor_id"
            "    )"
            ")",
        ],
    )

    _exec_if_table(
        "enrollments",
        [
            'ALTER TABLE public."enrollments" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS enrollments_select_policy ON public.enrollments",
            "CREATE POLICY enrollments_select_policy ON public.enrollments "
            "FOR SELECT USING (auth.uid() = user_id)",
            "DROP POLICY IF EXISTS enrollments_modify_policy ON public.enrollments",
            "CREATE POLICY enrollments_modify_policy ON public.enrollments "
            "FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)",
        ],
    )

    _exec_if_table(
        "exercise_submissions",
        [
            'ALTER TABLE public."exercise_submissions" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS exercise_submissions_select_policy ON public.exercise_submissions",
            "CREATE POLICY exercise_submissions_select_policy ON public.exercise_submissions "
            "FOR SELECT USING (auth.uid() = user_id)",
            "DROP POLICY IF EXISTS exercise_submissions_modify_policy ON public.exercise_submissions",
            "CREATE POLICY exercise_submissions_modify_policy ON public.exercise_submissions "
            "FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)",
        ],
    )

    _exec_if_table(
        "materials",
        [
            'ALTER TABLE public."materials" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS materials_select_policy ON public.materials",
            "CREATE POLICY materials_select_policy ON public.materials "
            "FOR SELECT USING (is_published = TRUE OR auth.uid() = uploaded_by)",
            "DROP POLICY IF EXISTS materials_modify_policy ON public.materials",
            "CREATE POLICY materials_modify_policy ON public.materials "
            "FOR ALL USING (auth.uid() = uploaded_by) WITH CHECK (auth.uid() = uploaded_by)",
        ],
    )

    _exec_if_table(
        "projects",
        [
            'ALTER TABLE public."projects" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS projects_select_policy ON public.projects",
            "CREATE POLICY projects_select_policy ON public.projects "
            "FOR SELECT USING (is_published = TRUE OR auth.uid() = created_by)",
            "DROP POLICY IF EXISTS projects_modify_policy ON public.projects",
            "CREATE POLICY projects_modify_policy ON public.projects "
            "FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by)",
        ],
    )

    _exec_if_table(
        "project_submissions",
        [
            'ALTER TABLE public."project_submissions" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS project_submissions_select_policy ON public.project_submissions",
            "CREATE POLICY project_submissions_select_policy ON public.project_submissions "
            "FOR SELECT USING (auth.uid() = user_id OR auth.uid() = graded_by)",
            "DROP POLICY IF EXISTS project_submissions_modify_policy ON public.project_submissions",
            "CREATE POLICY project_submissions_modify_policy ON public.project_submissions "
            "FOR ALL USING (auth.uid() = user_id OR auth.uid() = graded_by) "
            "WITH CHECK (auth.uid() = user_id OR auth.uid() = graded_by)",
        ],
    )

    _exec_if_table(
        "articles",
        [
            'ALTER TABLE public."articles" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS articles_select_policy ON public.articles",
            "CREATE POLICY articles_select_policy ON public.articles "
            "FOR SELECT USING (is_published = TRUE OR auth.uid() = author_id)",
            "DROP POLICY IF EXISTS articles_modify_policy ON public.articles",
            "CREATE POLICY articles_modify_policy ON public.articles "
            "FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id)",
        ],
    )

    _exec_if_table(
        "library_documents",
        [
            'ALTER TABLE public."library_documents" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS library_documents_select_policy ON public.library_documents",
            "CREATE POLICY library_documents_select_policy ON public.library_documents "
            "FOR SELECT USING (LOWER(status::text) = 'published' OR auth.uid() = uploaded_by)",
            "DROP POLICY IF EXISTS library_documents_modify_policy ON public.library_documents",
            "CREATE POLICY library_documents_modify_policy ON public.library_documents "
            "FOR ALL USING (auth.uid() = uploaded_by) WITH CHECK (auth.uid() = uploaded_by)",
        ],
    )

    _exec_if_table(
        "library_subjects",
        [
            'ALTER TABLE public."library_subjects" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS library_subjects_select_policy ON public.library_subjects",
            "CREATE POLICY library_subjects_select_policy ON public.library_subjects "
            "FOR SELECT USING (is_active = TRUE OR is_active IS NULL)",
        ],
    )

    _exec_if_table(
        "news",
        [
            'ALTER TABLE public."news" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS news_select_policy ON public.news",
            "CREATE POLICY news_select_policy ON public.news "
            "FOR SELECT USING (LOWER(status::text) = 'published' OR auth.uid() = author_id)",
            "DROP POLICY IF EXISTS news_modify_policy ON public.news",
            "CREATE POLICY news_modify_policy ON public.news "
            "FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id)",
        ],
    )

    _exec_if_table(
        "assessments",
        [
            'ALTER TABLE public."assessments" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS assessments_select_policy ON public.assessments",
            "CREATE POLICY assessments_select_policy ON public.assessments "
            "FOR SELECT USING (is_published = TRUE OR auth.uid() = created_by)",
            "DROP POLICY IF EXISTS assessments_modify_policy ON public.assessments",
            "CREATE POLICY assessments_modify_policy ON public.assessments "
            "FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by)",
        ],
    )

    _exec_if_table(
        "questions",
        [
            'ALTER TABLE public."questions" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS questions_select_policy ON public.questions",
            "CREATE POLICY questions_select_policy ON public.questions "
            "FOR SELECT USING ("
            "    EXISTS ("
            "        SELECT 1 FROM public.assessments "
            "        WHERE assessments.id = questions.assessment_id "
            "          AND (assessments.is_published = TRUE OR auth.uid() = assessments.created_by)"
            "    )"
            ")",
            "DROP POLICY IF EXISTS questions_modify_policy ON public.questions",
            "CREATE POLICY questions_modify_policy ON public.questions "
            "FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by)",
        ],
    )

    _exec_if_table(
        "assessment_attempts",
        [
            'ALTER TABLE public."assessment_attempts" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS assessment_attempts_select_policy ON public.assessment_attempts",
            "CREATE POLICY assessment_attempts_select_policy ON public.assessment_attempts "
            "FOR SELECT USING (auth.uid() = user_id)",
            "DROP POLICY IF EXISTS assessment_attempts_modify_policy ON public.assessment_attempts",
            "CREATE POLICY assessment_attempts_modify_policy ON public.assessment_attempts "
            "FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)",
        ],
    )

    _exec_if_table(
        "assessment_results",
        [
            'ALTER TABLE public."assessment_results" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS assessment_results_select_policy ON public.assessment_results",
            "CREATE POLICY assessment_results_select_policy ON public.assessment_results "
            "FOR SELECT USING (auth.uid() = student_id)",
            "DROP POLICY IF EXISTS assessment_results_modify_policy ON public.assessment_results",
            "CREATE POLICY assessment_results_modify_policy ON public.assessment_results "
            "FOR ALL USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id)",
        ],
    )

    _exec_if_table(
        "question_responses",
        [
            'ALTER TABLE public."question_responses" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS question_responses_select_policy ON public.question_responses",
            "CREATE POLICY question_responses_select_policy ON public.question_responses "
            "FOR SELECT USING ("
            "    EXISTS ("
            "        SELECT 1 FROM public.assessment_attempts "
            "        WHERE assessment_attempts.id = question_responses.attempt_id "
            "          AND auth.uid() = assessment_attempts.user_id"
            "    )"
            ")",
            "DROP POLICY IF EXISTS question_responses_modify_policy ON public.question_responses",
            "CREATE POLICY question_responses_modify_policy ON public.question_responses "
            "FOR ALL USING ("
            "    EXISTS ("
            "        SELECT 1 FROM public.assessment_attempts "
            "        WHERE assessment_attempts.id = question_responses.attempt_id "
            "          AND auth.uid() = assessment_attempts.user_id"
            "    )"
            ") WITH CHECK ("
            "    EXISTS ("
            "        SELECT 1 FROM public.assessment_attempts "
            "        WHERE assessment_attempts.id = question_responses.attempt_id "
            "          AND auth.uid() = assessment_attempts.user_id"
            "    )"
            ")",
        ],
    )

    _exec_if_table(
        "item_bank",
        [
            'ALTER TABLE public."item_bank" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS item_bank_select_policy ON public.item_bank",
            "CREATE POLICY item_bank_select_policy ON public.item_bank "
            "FOR SELECT USING (auth.uid() = created_by)",
            "DROP POLICY IF EXISTS item_bank_modify_policy ON public.item_bank",
            "CREATE POLICY item_bank_modify_policy ON public.item_bank "
            "FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by)",
        ],
    )

    _exec_if_table(
        "test_results",
        [
            'ALTER TABLE public."test_results" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS test_results_select_policy ON public.test_results",
            "CREATE POLICY test_results_select_policy ON public.test_results "
            "FOR SELECT USING (auth.uid() = user_id)",
            "DROP POLICY IF EXISTS test_results_modify_policy ON public.test_results",
            "CREATE POLICY test_results_modify_policy ON public.test_results "
            "FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)",
        ],
    )

    _exec_if_table(
        "student_progress",
        [
            'ALTER TABLE public."student_progress" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS student_progress_select_policy ON public.student_progress",
            "CREATE POLICY student_progress_select_policy ON public.student_progress "
            "FOR SELECT USING (auth.uid() = user_id)",
            "DROP POLICY IF EXISTS student_progress_modify_policy ON public.student_progress",
            "CREATE POLICY student_progress_modify_policy ON public.student_progress "
            "FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)",
        ],
    )

    _exec_if_table(
        "chat_sessions",
        [
            'ALTER TABLE public."chat_sessions" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS chat_sessions_select_policy ON public.chat_sessions",
            "CREATE POLICY chat_sessions_select_policy ON public.chat_sessions "
            "FOR SELECT USING (auth.uid() = user_id)",
            "DROP POLICY IF EXISTS chat_sessions_modify_policy ON public.chat_sessions",
            "CREATE POLICY chat_sessions_modify_policy ON public.chat_sessions "
            "FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)",
        ],
    )

    _exec_if_table(
        "chat_messages",
        [
            'ALTER TABLE public."chat_messages" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS chat_messages_select_policy ON public.chat_messages",
            "CREATE POLICY chat_messages_select_policy ON public.chat_messages "
            "FOR SELECT USING ("
            "    EXISTS ("
            "        SELECT 1 FROM public.chat_sessions "
            "        WHERE chat_sessions.id = chat_messages.session_id "
            "          AND auth.uid() = chat_sessions.user_id"
            "    )"
            ")",
            "DROP POLICY IF EXISTS chat_messages_modify_policy ON public.chat_messages",
            "CREATE POLICY chat_messages_modify_policy ON public.chat_messages "
            "FOR ALL USING ("
            "    EXISTS ("
            "        SELECT 1 FROM public.chat_sessions "
            "        WHERE chat_sessions.id = chat_messages.session_id "
            "          AND auth.uid() = chat_sessions.user_id"
            "    )"
            ") WITH CHECK ("
            "    EXISTS ("
            "        SELECT 1 FROM public.chat_sessions "
            "        WHERE chat_sessions.id = chat_messages.session_id "
            "          AND auth.uid() = chat_sessions.user_id"
            "    )"
            ")",
        ],
    )

    _exec_if_table(
        "chat_feedback",
        [
            'ALTER TABLE public."chat_feedback" ENABLE ROW LEVEL SECURITY',
            "DROP POLICY IF EXISTS chat_feedback_select_policy ON public.chat_feedback",
            "CREATE POLICY chat_feedback_select_policy ON public.chat_feedback "
            "FOR SELECT USING (auth.uid() = user_id)",
            "DROP POLICY IF EXISTS chat_feedback_modify_policy ON public.chat_feedback",
            "CREATE POLICY chat_feedback_modify_policy ON public.chat_feedback "
            "FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)",
        ],
    )


def downgrade() -> None:
    """Drop policies and disable RLS."""
    def drop_and_disable(table: str, policies: list[str]) -> None:
        statements = [
            f"DROP POLICY IF EXISTS {policy} ON public.\"{table}\"" for policy in policies
        ]
        statements.append(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY')
        _exec_if_table(table, statements)

    drop_and_disable("profiles", ["profiles_select_own", "profiles_update_own"])
    drop_and_disable("courses", ["courses_select_policy", "courses_modify_policy"])
    drop_and_disable("lessons", ["lessons_select_policy", "lessons_modify_policy"])
    drop_and_disable("exercises", ["exercises_select_policy", "exercises_modify_policy"])
    drop_and_disable(
        "enrollments",
        ["enrollments_select_policy", "enrollments_modify_policy"],
    )
    drop_and_disable(
        "exercise_submissions",
        ["exercise_submissions_select_policy", "exercise_submissions_modify_policy"],
    )
    drop_and_disable("materials", ["materials_select_policy", "materials_modify_policy"])
    drop_and_disable("projects", ["projects_select_policy", "projects_modify_policy"])
    drop_and_disable(
        "project_submissions",
        ["project_submissions_select_policy", "project_submissions_modify_policy"],
    )
    drop_and_disable("articles", ["articles_select_policy", "articles_modify_policy"])
    drop_and_disable(
        "library_documents",
        ["library_documents_select_policy", "library_documents_modify_policy"],
    )
    drop_and_disable("library_subjects", ["library_subjects_select_policy"])
    drop_and_disable("news", ["news_select_policy", "news_modify_policy"])
    drop_and_disable(
        "assessments",
        ["assessments_select_policy", "assessments_modify_policy"],
    )
    drop_and_disable("questions", ["questions_select_policy", "questions_modify_policy"])
    drop_and_disable(
        "assessment_attempts",
        ["assessment_attempts_select_policy", "assessment_attempts_modify_policy"],
    )
    drop_and_disable(
        "assessment_results",
        ["assessment_results_select_policy", "assessment_results_modify_policy"],
    )
    drop_and_disable(
        "question_responses",
        ["question_responses_select_policy", "question_responses_modify_policy"],
    )
    drop_and_disable("item_bank", ["item_bank_select_policy", "item_bank_modify_policy"])
    drop_and_disable(
        "test_results",
        ["test_results_select_policy", "test_results_modify_policy"],
    )
    drop_and_disable(
        "student_progress",
        ["student_progress_select_policy", "student_progress_modify_policy"],
    )
    drop_and_disable(
        "chat_sessions",
        ["chat_sessions_select_policy", "chat_sessions_modify_policy"],
    )
    drop_and_disable(
        "chat_messages",
        ["chat_messages_select_policy", "chat_messages_modify_policy"],
    )
    drop_and_disable(
        "chat_feedback",
        ["chat_feedback_select_policy", "chat_feedback_modify_policy"],
    )
