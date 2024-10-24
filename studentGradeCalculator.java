import java.util.Scanner;

class student {
    public float total = 500.0f;
    public float sum = 0.0f; 
    public float percentage;
    public String[] arr = {"Hindi", "English", "Math", "Science", "Social Science"};
    public int[] arr2 = new int[5]; 

    public void getmarks() {
        Scanner scanner = new Scanner(System.in);
        for (int i = 0; i < 5; i++) {
            System.out.print("Enter marks for " + arr[i] + " (1-100) : ");
            arr2[i] = scanner.nextInt();
        }
    }

    public void calculation() {
        for (int j = 0; j < 5; j++) {
            sum += arr2[j];
        }
     
        percentage = (sum / total) * 100; 
        System.out.println("Your percentage is: " + percentage + "%");
    }

    public void result() {
        if (percentage > 90.0 && percentage <= 100.0) {
            System.out.println("Your grade is : A");
            System.out.println(".......Result status Passed..........\n");
        }
        
        if (percentage > 80.0 && percentage <= 90.0) {
            System.out.println("Your total marks is : " + sum + "/" + total);
            System.out.println("Your grade is : B");
            System.out.println(".......Result status Passed..........\n");
        }
        
        if (percentage > 70.0 && percentage <= 80.0) {
            System.out.println("Your total marks is : " + sum + "/" + total);
            System.out.println("Your grade is : C");
            System.out.println(".......Result status Passed..........\n");
        }
        
        if (percentage > 60.0 && percentage <= 70.0) {
            System.out.println("Your total marks is : " + sum + "/" + total);
            System.out.println("Your grade is : D");
            System.out.println(".......Result status Passed..........\n");
        }
        
        if (percentage > 50.0 && percentage <= 60.0) {
            System.out.println("Your total marks is : " + sum + "/" + total);
            System.out.println("Your grade is : E");
            System.out.println(".......Result status Passed..........\n");
        }
        
        if (percentage < 50.0) {
            System.out.println("Your total marks is : " + sum + "/" + total);
            System.out.println(".......You Failed the exam..........\n");
        }
    }

    public static void main(String[] args) {
        student s1 = new student();
        s1.getmarks();
        s1.calculation();
        s1.result();
    }
}
