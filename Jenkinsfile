
pipeline {
    agent any 
    
   triggers {
        pollSCM('* * * * *')  // checks every minute
    }
    stages {
        stage('pull') {
            steps {
                git branch: 'main ', url: 'https://github.com/kirandhurve18/api.restaurantmandi-backend-.git'
            }
        }
    }
