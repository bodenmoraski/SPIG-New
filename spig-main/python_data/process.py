import data
import json
import sys

REPORT_VERSION = 0x1

def eprint(*args, **kwargs):
    """
    Use `eprint(...)` for debugging messages, as the typical `print(...)` will be picked up
    as the computed output of the program
    """
    print(*args, file=sys.stderr, **kwargs)

def main():
    eprint(" -> Expecting SPIG student data in JSON format from stdin...")

    raw_data = input()
    try:
        # the second part makes sure that everything is a float
        d = json.loads(raw_data, parse_int=lambda x: float(x))
    except Exception as i:
        eprint(i)
        eprint(" #> Failed to parse JSON.")
        exit(1)

    if not isinstance(d, dict):
        eprint(" #> That's not a dictionary.")
        exit(1)

    eprint(" -> Processing data...")
    
    data_to_crunch = ['teacher_only', 'students_only', 'groups_only', 'total_average', 'weighted_average', 'highest', 'lowest', 'median']

    students: list[str] = d['students']
    teacher_grades: list[float] = d['teacher_grades']
    student_to_student: list[list[float]] = d['grades']
    group_grades: list[list[float]] = d['group_grades']

    reports = {}

    all_final_grades: list[float] = []
    for i, student in enumerate(students):
        eprint(f" -> Calculating {student}...")
        report = {}
        for ty in data_to_crunch:
            grade = data.final_grade_formulas(
                teacher_grades[i],
                student_to_student[i],
                group_grades[i],
                ty
            )
            report[ty] = grade
            if ty == "weighted_average":
                all_final_grades.append(grade)

        reports[student] = report

    eprint(" -> Calculating class-wide report...")
    class_report = data.class_statistics(all_final_grades)

    reports['class'] = class_report
    reports['version'] = REPORT_VERSION
    
    eprint(reports) 

    # this must be the only print statement in the program!
    # it is supposed to print directly to stdout to be picked
    # up by the calling elixir code
    print(json.dumps(reports))


if __name__ == "__main__":
    main()