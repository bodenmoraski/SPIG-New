from typing import Literal
import numpy, pandas 

def find_average(data_aslist):
    if not data_aslist:
        return 0
    return sum(data_aslist)/len(data_aslist)

def find_median(data_aslist):
    if not data_aslist:
        raise ValueError("List is empty")

    n = len(data_aslist)
    if n % 2 == 1:
        return select(data_aslist, n // 2)
    else:
        return 0.5 * (select(data_aslist, n // 2 - 1) + select(data_aslist, n // 2))

# -------------------------- 2D ARRAY FUNCTIONALITY ------------------------------

# This assumes that grades given are x axis, students grading are y axis
def class_average_received(grades_2darr):
    return numpy.mean(grades_2darr)

def average_selfscore_given(grades_2darr):
    if not grades_2darr:
        return 0
    
    n = len(grades_2darr)
    selfgrades = [grades_2darr[i][i] for i in range(0,n)]
    return numpy.mean(selfgrades)


#---------------MIXED DATA FOR TEACHER + STUDENTS ----------------------

# sgrades_2darr is a square 2d array, where rows are the grades given by any
# specific student. the line x=y (or spot [n][n]) in the matrix represents self-grades. 

# tgrades_1arr is a 1d array comprised of the score given to each student by the teacher. mix_data appends
# this to the top of sgrades_2darr to make a "mixed array". All arrays signified by "mgrades2d_arr" should be mixed. 


def mix_data(sgrades_2darr, tgrades_1arr):
    sgrades_2darr = numpy.array(sgrades_2darr)
    tgrades_1arr = numpy.array(tgrades_1arr)
    
    if tgrades_1arr.shape[0] != sgrades_2darr.shape[1]:
        raise ValueError("The number of grades given by the teacher must match the number of students.")
    
    mixed_2darr = numpy.vstack((tgrades_1arr, sgrades_2darr))
    
    return mixed_2darr.tolist()

#    Student_index is the student #. 0 is first, n-1 for n students is last. 

def average_grade_given(mgrades_2darr, student_index):
    if not mgrades_2darr or student_index < 0 or student_index >= len(mgrades_2darr) - 1:
        return 0
    return numpy.mean(mgrades_2darr[student_index + 1])


def average_grade_received(mgrades_2darr, student_index):
    if not mgrades_2darr or student_index < 0 or student_index >= len(mgrades_2darr[0]):
        return 0
    return numpy.mean([row[student_index] for row in mgrades_2darr])


def teacher_grade(mgrades_2darr, student_index):
    if not mgrades_2darr or student_index < 0 or student_index >= len(mgrades_2darr[0]):
        return 0
    return mgrades_2darr[0][student_index]


def self_grade_for_stu(mgrades_2darr, student_index):
    if not mgrades_2darr or student_index < 0 or student_index >= len(mgrades_2darr) - 1:
        return 0
    return mgrades_2darr[student_index + 1][student_index]


def average_stu2stu_grade_given(mgrades_2darr):
    if not mgrades_2darr or len(mgrades_2darr) <= 1:
        return 0
    student_grades = mgrades_2darr[1:] 
    return numpy.mean(student_grades, axis=1).tolist()


def average_teach2stu_grade_given(mgrades_2darr):
    if not mgrades_2darr or len(mgrades_2darr[0]) == 0:
        return 0
    return numpy.mean(mgrades_2darr[0])


def average_self_grade(mgrades_2darr):
    if not mgrades_2darr or len(mgrades_2darr) <= 1:
        return 0
    
    n = len(mgrades_2darr) - 1 
    self_grades = [mgrades_2darr[i+1][i] for i in range(n)]
    return numpy.mean(self_grades)


def median_grade_given(mgrades_2darr, student_index):
    if not mgrades_2darr or student_index < 0 or student_index >= len(mgrades_2darr) - 1:
        return 0
    return numpy.median(mgrades_2darr[student_index + 1])


def median_grade_received(mgrades_2darr, student_index):
    if not mgrades_2darr or student_index < 0 or student_index >= len(mgrades_2darr[0]):
        return 0
    return numpy.median([row[student_index] for row in mgrades_2darr])


def stddev_grade_given(mgrades_2darr, student_index):
    if not mgrades_2darr or student_index < 0 or student_index >= len(mgrades_2darr) - 1:
        return 0
    return numpy.std(mgrades_2darr[student_index + 1])


def stddev_grade_received(mgrades_2darr, student_index):
    if not mgrades_2darr or student_index < 0 or student_index >= len(mgrades_2darr[0]):
        return 0
    return numpy.std([row[student_index] for row in mgrades_2darr])


#--------------- FINAL GRADE FUNCTIONS ----------------------
'''
this assumes that:

teacher_score -> integer of what the teacher scored the submission
student_scores -> 1d array of the student scores for the submission
group_scores -> 1d array of the scores that the groups gave the submission


TYPE INPUTS:

'teacher_only' or 'to': Uses only the teacher's score
'students_only' or 'so': Uses the average of student scores
'groups_only' or 'go': Uses the average of group scores
'total_average' or 'ta': Calculates the average of teacher, student, and group scores
'weighted_average' or 'wa': Calculates a weighted average (40% teacher, 30% students, 30% groups)
'highest' or 'h': Returns the highest score among teacher, student average, and group average
'lowest' or 'l': Returns the lowest score among teacher, student average, and group average
'median' or 'm': Returns the median of teacher score, student average, and group average


'''

def final_grade_formulas(teacher_score: float, student_scores: list[float], group_scores: list[float], type: str):
    type = type.lower()

    if type in ['teacher_only', 'to']:
        return round(teacher_score, 2)
    
    if type in ['students_only', 'so']:
        return round(smean(student_scores), 2)
    
    if type in ['groups_only', 'go']:
        return round(smean(group_scores), 2)
    
    if type in ["total_average", "ta"]:
        return round((teacher_score + smean(student_scores) + smean(group_scores)) / 3, 2)
    
    if type in ["weighted_average", "wa"]:
        return round(0.4 * teacher_score + 0.3 * smean(student_scores) + 0.3 * smean(group_scores), 2)
    
    all_scores = student_scores + group_scores
    all_scores.append(teacher_score)
    
    if type in ["highest", "h"]:
        return round(max(teacher_score, smax(student_scores), smax(group_scores)), 2)
    
    if type in ["lowest", "l"]:
        return round(min(teacher_score, smin(student_scores), smin(group_scores)), 2)
    
    if type in ["median", "m"]:
        return round(numpy.median(all_scores), 2)
    
    raise ValueError("Invalid grade calculation type")

def class_statistics(final_student_scores: list[float]):
    return {
        "median": smean(final_student_scores),
        "lowest": smin(final_student_scores),
        "highest": smax(final_student_scores),
        "median": smedian(final_student_scores)
    }

def smean(arr: list) -> float:
    """
    Safe mean (numpy.mean with a default of zero)
    """
    if len(arr) == 0:
        return 0
    return numpy.mean(arr)

def smax(arr: list) -> float:
    """
    Safe max (numpy.max with a default of zero)
    """
    if len(arr) == 0:
        return 0
    return numpy.max(arr)

def smin(arr: list) -> float:
    """
    Safe min (numpy.min with a default of zero)
    """
    if len(arr) == 0:
        return 0
    return numpy.min(arr)

def smedian(arr: list) -> float:
    """
    Safe median (numpy.median with a default of zero)
    """
    if len(arr) == 0:
        return 0
    return numpy.median(arr)

def select(arr, k):
    """
    Select the k-th smallest element in the list.
    
    :param arr: List of numbers
    :param k: Position (0-based) of the desired element in the sorted list
    :return: k-th smallest element
    """
    if len(arr) <= 5:
        return sorted(arr)[k]

    # Split arr into sublists of 5 elements each
    sublists = [arr[i:i + 5] for i in range(0, len(arr), 5)]

    # Find medians of the sublists
    medians = [sorted(sublist)[len(sublist) // 2] for sublist in sublists]

    # Recursively find the median of the medians
    pivot = select(medians, len(medians) // 2)

    # Partition the array around the pivot
    low = [x for x in arr if x < pivot]
    high = [x for x in arr if x > pivot]
    pivots = [x for x in arr if x == pivot]

    if k < len(low):
        return select(low, k)
    elif k < len(low) + len(pivots):
        return pivot
    else:
        return select(high, k - len(low) - len(pivots))