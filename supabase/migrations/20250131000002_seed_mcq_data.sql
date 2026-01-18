-- Seed MCQ Sample Data
-- This script adds sample subjects, concepts, questions, and options for testing

-- First, get a trainer/admin user ID (using the first admin or trainer profile)
DO $$
DECLARE
  trainer_id UUID;
BEGIN
  -- Get the first trainer or admin user, or create a dummy reference
  SELECT id INTO trainer_id FROM public.profiles 
  WHERE role IN ('trainer', 'admin') 
  LIMIT 1;
  
  -- If no trainer exists, we'll use a placeholder (this will be updated when you have a trainer)
  IF trainer_id IS NULL THEN
    -- Use the first user as fallback
    SELECT id INTO trainer_id FROM public.profiles LIMIT 1;
  END IF;

  -- Insert Subjects
  INSERT INTO public.mcq_subjects (id, name, description, status, created_by)
  VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Java Programming', 'Object-oriented programming with Java, covering core concepts, OOP principles, and Java APIs', 'active', trainer_id),
    ('00000000-0000-0000-0000-000000000002', 'Python Programming', 'Python programming fundamentals, data structures, and common libraries', 'active', trainer_id),
    ('00000000-0000-0000-0000-000000000003', 'Medical Coding', 'Medical terminology, ICD-10 codes, CPT codes, and healthcare documentation', 'active', trainer_id),
    ('00000000-0000-0000-0000-000000000004', 'Taxation', 'Income tax, GST, TDS, and various tax-related concepts', 'active', trainer_id),
    ('00000000-0000-0000-0000-000000000005', 'Aptitude', 'Quantitative aptitude, logical reasoning, and problem-solving', 'active', trainer_id)
  ON CONFLICT (id) DO NOTHING;

  -- Insert Concepts for Java
  INSERT INTO public.mcq_concepts (id, subject_id, name, description)
  VALUES 
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'OOP Basics', 'Object-Oriented Programming fundamentals: classes, objects, inheritance, polymorphism'),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Java Collections', 'ArrayList, HashMap, HashSet, and other collection frameworks'),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Exception Handling', 'Try-catch blocks, custom exceptions, and error handling')
  ON CONFLICT (subject_id, name) DO NOTHING;

  -- Insert Concepts for Python
  INSERT INTO public.mcq_concepts (id, subject_id, name, description)
  VALUES 
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000002', 'Data Types', 'Python data types: strings, lists, dictionaries, tuples'),
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000002', 'Functions & Modules', 'Function definition, parameters, return values, and module imports'),
    ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000002', 'Object-Oriented Python', 'Classes, objects, inheritance in Python')
  ON CONFLICT (subject_id, name) DO NOTHING;

  -- Insert Concepts for Medical Coding
  INSERT INTO public.mcq_concepts (id, subject_id, name, description)
  VALUES 
    ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000003', 'ICD-10 Codes', 'International Classification of Diseases 10th Revision coding system'),
    ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000003', 'CPT Codes', 'Current Procedural Terminology codes for medical procedures'),
    ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000003', 'Medical Terminology', 'Common medical terms, abbreviations, and anatomy')
  ON CONFLICT (subject_id, name) DO NOTHING;

  -- Insert Concepts for Taxation
  INSERT INTO public.mcq_concepts (id, subject_id, name, description)
  VALUES 
    ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000004', 'Income Tax', 'Income tax calculation, deductions, and filing'),
    ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000004', 'GST', 'Goods and Services Tax: CGST, SGST, IGST, and compliance'),
    ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0000-000000000004', 'TDS', 'Tax Deducted at Source: rates, compliance, and filing')
  ON CONFLICT (subject_id, name) DO NOTHING;

  -- Insert Concepts for Aptitude
  INSERT INTO public.mcq_concepts (id, subject_id, name, description)
  VALUES 
    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-000000000005', 'Quantitative Aptitude', 'Mathematics: algebra, geometry, arithmetic, percentages'),
    ('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0000-000000000005', 'Logical Reasoning', 'Pattern recognition, sequences, analogies, and logical puzzles'),
    ('00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0000-000000000005', 'Data Interpretation', 'Charts, graphs, tables, and data analysis')
  ON CONFLICT (subject_id, name) DO NOTHING;

  -- Insert Java Questions
  INSERT INTO public.mcq_questions (id, subject_id, concept_id, question_text, difficulty, marks, negative_marks, explanation, created_by)
  VALUES 
    ('00000000-0000-0000-0101-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 
     'Which of the following is NOT a principle of Object-Oriented Programming?', 'Easy', 1, 0.25,
     'The four main principles of OOP are Encapsulation, Inheritance, Polymorphism, and Abstraction. Modularity is a general programming concept but not specifically an OOP principle.', trainer_id),
     
    ('00000000-0000-0000-0101-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002',
     'Which collection class allows duplicate elements and maintains insertion order?', 'Easy', 1, 0.25,
     'ArrayList allows duplicate elements and maintains the insertion order. HashMap doesn''t maintain order, HashSet doesn''t allow duplicates, and TreeSet sorts elements.', trainer_id),
     
    ('00000000-0000-0000-0101-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003',
     'What happens when an exception is thrown in a try block but not caught by any catch block?', 'Medium', 2, 0.5,
     'If an exception is not caught in the current method, it propagates to the calling method. If not caught anywhere, the program terminates with an unhandled exception error.', trainer_id);

  -- Insert Java Question Options
  INSERT INTO public.mcq_options (question_id, option_text, is_correct, order_index)
  VALUES 
    -- Question 1 Options
    ('00000000-0000-0000-0101-000000000001', 'Encapsulation', FALSE, 0),
    ('00000000-0000-0000-0101-000000000001', 'Inheritance', FALSE, 1),
    ('00000000-0000-0000-0101-000000000001', 'Modularity', TRUE, 2),
    ('00000000-0000-0000-0101-000000000001', 'Polymorphism', FALSE, 3),
    
    -- Question 2 Options
    ('00000000-0000-0000-0101-000000000002', 'ArrayList', TRUE, 0),
    ('00000000-0000-0000-0101-000000000002', 'HashMap', FALSE, 1),
    ('00000000-0000-0000-0101-000000000002', 'HashSet', FALSE, 2),
    ('00000000-0000-0000-0101-000000000002', 'TreeSet', FALSE, 3),
    
    -- Question 3 Options
    ('00000000-0000-0000-0101-000000000003', 'Program continues execution', FALSE, 0),
    ('00000000-0000-0000-0101-000000000003', 'Exception is silently ignored', FALSE, 1),
    ('00000000-0000-0000-0101-000000000003', 'Exception propagates to calling method', TRUE, 2),
    ('00000000-0000-0000-0101-000000000003', 'Exception is converted to a warning', FALSE, 3);

  -- Insert Python Questions
  INSERT INTO public.mcq_questions (id, subject_id, concept_id, question_text, difficulty, marks, negative_marks, explanation, created_by)
  VALUES 
    ('00000000-0000-0000-0201-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0002-000000000001',
     'Which of the following data types is mutable in Python?', 'Easy', 1, 0.25,
     'Lists and dictionaries are mutable (can be modified after creation), while tuples and strings are immutable.', trainer_id),
     
    ('00000000-0000-0000-0201-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0002-000000000002',
     'What is the output of: print(list(range(5)))?', 'Easy', 1, 0.25,
     'range(5) generates numbers from 0 to 4 (5 numbers total), and list() converts it to [0, 1, 2, 3, 4].', trainer_id),
     
    ('00000000-0000-0000-0201-000000000003', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0002-000000000003',
     'In Python, what does the __init__ method do?', 'Medium', 2, 0.5,
     'The __init__ method is a constructor that is automatically called when an object is created from a class. It initializes the object''s attributes.', trainer_id);

  -- Insert Python Question Options
  INSERT INTO public.mcq_options (question_id, option_text, is_correct, order_index)
  VALUES 
    -- Question 1 Options
    ('00000000-0000-0000-0201-000000000001', 'Tuple', FALSE, 0),
    ('00000000-0000-0000-0201-000000000001', 'List', TRUE, 1),
    ('00000000-0000-0000-0201-000000000001', 'String', FALSE, 2),
    ('00000000-0000-0000-0201-000000000001', 'Integer', FALSE, 3),
    
    -- Question 2 Options
    ('00000000-0000-0000-0201-000000000002', '[0, 1, 2, 3, 4]', TRUE, 0),
    ('00000000-0000-0000-0201-000000000002', '[1, 2, 3, 4, 5]', FALSE, 1),
    ('00000000-0000-0000-0201-000000000002', '[0, 1, 2, 3, 4, 5]', FALSE, 2),
    ('00000000-0000-0000-0201-000000000002', 'Error', FALSE, 3),
    
    -- Question 3 Options
    ('00000000-0000-0000-0201-000000000003', 'Destroys the object', FALSE, 0),
    ('00000000-0000-0000-0201-000000000003', 'Initializes the object', TRUE, 1),
    ('00000000-0000-0000-0201-000000000003', 'Prints object details', FALSE, 2),
    ('00000000-0000-0000-0201-000000000003', 'Converts object to string', FALSE, 3);

  -- Insert Medical Coding Questions
  INSERT INTO public.mcq_questions (id, subject_id, concept_id, question_text, difficulty, marks, negative_marks, explanation, created_by)
  VALUES 
    ('00000000-0000-0000-0301-000000000001', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0003-000000000001',
     'What does ICD-10 stand for?', 'Easy', 1, 0.25,
     'ICD-10 stands for International Classification of Diseases, 10th Revision. It is a medical coding system used to classify diseases and health conditions.', trainer_id),
     
    ('00000000-0000-0000-0301-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0003-000000000002',
     'CPT codes are primarily used for:', 'Medium', 2, 0.5,
     'CPT (Current Procedural Terminology) codes are used to describe medical, surgical, and diagnostic services provided by healthcare professionals.', trainer_id);

  -- Insert Medical Coding Question Options
  INSERT INTO public.mcq_options (question_id, option_text, is_correct, order_index)
  VALUES 
    -- Question 1 Options
    ('00000000-0000-0000-0301-000000000001', 'International Classification of Diseases, 10th Revision', TRUE, 0),
    ('00000000-0000-0000-0301-000000000001', 'Internal Code Directory, 10th Edition', FALSE, 1),
    ('00000000-0000-0000-0301-000000000001', 'Integrated Clinical Documentation, Version 10', FALSE, 2),
    ('00000000-0000-0000-0301-000000000001', 'International Clinical Data, 10th Standard', FALSE, 3),
    
    -- Question 2 Options
    ('00000000-0000-0000-0301-000000000002', 'Diagnosing diseases', FALSE, 0),
    ('00000000-0000-0000-0301-000000000002', 'Medical procedures and services', TRUE, 1),
    ('00000000-0000-0000-0301-000000000002', 'Patient billing information', FALSE, 2),
    ('00000000-0000-0000-0301-000000000002', 'Insurance claims only', FALSE, 3);

  -- Insert Taxation Questions
  INSERT INTO public.mcq_questions (id, subject_id, concept_id, question_text, difficulty, marks, negative_marks, explanation, created_by)
  VALUES 
    ('00000000-0000-0000-0401-000000000001', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0004-000000000002',
     'What does GST stand for?', 'Easy', 1, 0.25,
     'GST stands for Goods and Services Tax. It is a comprehensive indirect tax levied on the supply of goods and services in India.', trainer_id),
     
    ('00000000-0000-0000-0401-000000000002', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0004-000000000001',
     'What is the basic exemption limit for income tax for individuals below 60 years (AY 2023-24)?', 'Medium', 2, 0.5,
     'For individuals below 60 years, the basic exemption limit is ₹2,50,000. This means no tax is payable on income up to this amount.', trainer_id);

  -- Insert Taxation Question Options
  INSERT INTO public.mcq_options (question_id, option_text, is_correct, order_index)
  VALUES 
    -- Question 1 Options
    ('00000000-0000-0000-0401-000000000001', 'Goods and Services Tax', TRUE, 0),
    ('00000000-0000-0000-0401-000000000001', 'General Sales Tax', FALSE, 1),
    ('00000000-0000-0000-0401-000000000001', 'Government Service Tax', FALSE, 2),
    ('00000000-0000-0000-0401-000000000001', 'Gross Sales Tax', FALSE, 3),
    
    -- Question 2 Options
    ('00000000-0000-0000-0401-000000000002', '₹1,00,000', FALSE, 0),
    ('00000000-0000-0000-0401-000000000002', '₹2,50,000', TRUE, 1),
    ('00000000-0000-0000-0401-000000000002', '₹3,00,000', FALSE, 2),
    ('00000000-0000-0000-0401-000000000002', '₹5,00,000', FALSE, 3);

  -- Insert Aptitude Questions
  INSERT INTO public.mcq_questions (id, subject_id, concept_id, question_text, difficulty, marks, negative_marks, explanation, created_by)
  VALUES 
    ('00000000-0000-0000-0501-000000000001', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0005-000000000001',
     'If a number is increased by 20% and then decreased by 20%, the net change is:', 'Medium', 2, 0.5,
     'Let the number be 100. After 20% increase: 120. After 20% decrease: 120 - 24 = 96. Net change = -4%, which is a 4% decrease.', trainer_id),
     
    ('00000000-0000-0000-0501-000000000002', '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0005-000000000002',
     'Complete the sequence: 2, 6, 12, 20, 30, ?', 'Medium', 2, 0.5,
     'The pattern is: 1×2=2, 2×3=6, 3×4=12, 4×5=20, 5×6=30, so next is 6×7=42.', trainer_id);

  -- Insert Aptitude Question Options
  INSERT INTO public.mcq_options (question_id, option_text, is_correct, order_index)
  VALUES 
    -- Question 1 Options
    ('00000000-0000-0000-0501-000000000001', 'No change', FALSE, 0),
    ('00000000-0000-0000-0501-000000000001', '4% increase', FALSE, 1),
    ('00000000-0000-0000-0501-000000000001', '4% decrease', TRUE, 2),
    ('00000000-0000-0000-0501-000000000001', '20% decrease', FALSE, 3),
    
    -- Question 2 Options
    ('00000000-0000-0000-0501-000000000002', '40', FALSE, 0),
    ('00000000-0000-0000-0501-000000000002', '42', TRUE, 1),
    ('00000000-0000-0000-0501-000000000002', '44', FALSE, 2),
    ('00000000-0000-0000-0501-000000000002', '46', FALSE, 3);

END $$;

-- Note: The above uses DO block with a trainer_id variable
-- If you need to run this and don't have a trainer, you may need to adjust the created_by values
-- Alternatively, you can manually set created_by to a specific user ID

