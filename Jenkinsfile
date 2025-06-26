pipeline {
 agent none
 parameters {
    string(name: 'ECRURL', defaultValue: '001647536300.dkr.ecr.ap-south-1.amazonaws.com', description: 'Please Enter your Docker ECR REGISTRY URL without https?')
    string(name: 'APPREPO', defaultValue: 'wezvatechbackend', description: 'Please Enter your Docker App Repo Name:TAG?')
    string(name: 'REGION', defaultValue: 'ap-south-1', description: 'Please Enter your AWS Region?') 
 }


 stages{
    stage('Checkout')
    {
      agent { label 'demo' }
      steps {
        git branch: 'main', credentialsId: 'GitlabCred', url: 'https://gitlab.com/wezvaprojects/ninjas/jobready1.0/build/frontend/node-express.git'
      }
     } 

    stage('Build-UnitTest')
    {
      agent { label 'demo' }
      steps {
            echo "Building Node Express ..."
            sh "npm install sonar-scanner"
            catchError(buildResult: 'SUCCESS', message: 'UNIT TEST FAILED') {
              sh "npm test"
            }
       }
    }


      stage("OWASP") 
      {
            agent { label 'demo' }
            steps{
                dependencyCheck additionalArguments: '--scan ./', odcInstallation: 'OWASP'
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }

        stage("SonarQube Analysis")
        {
            agent { label 'demo' }
            steps{
               withSonarQubeEnv("mysonarqube"){
                   sh 'echo "sonar.projectKey=nodejs" >> ./node_modules/sonar-scanner/conf/sonar-scanner.properties'
                   sh "npm run sonar"
               }
            }
        }

        stage("SonarQube Quality Gates")
        {
            agent { label 'demo' }
            steps{
               timeout(time: 1, unit: "MINUTES"){
                   waitForQualityGate abortPipeline: false
               }
            }
        }

       stage('Build Image')
       {
           agent { label 'demo' }
           steps{
             script {
                                  // Prepare the Tag name for the Image
                       AppTag = params.APPREPO + ":node" + env.BUILD_ID
                                  // Docker login needs https appended
                       ECR = "https://" + params.ECRURL
                       docker.withRegistry( ECR, 'ecr:ap-south-1:AWSCred' ) {
                                  // Build Docker Image locally
                           myImage = docker.build(AppTag)
                                 // Push the Image to the Registry 
                           myImage.push()
                       } 
             }
           }
       }

     stage ('Scan Image')
     {
        agent { label 'demo' }
	steps {
           echo "Scanning Image for Vulnerabilities"
           sh "trivy image --offline-scan  ${params.APPREPO}:node${env.BUILD_ID} > trivyresults.txt"

           echo "Analyze Dockerfile for best practices ..."
           sh "docker run --rm -i hadolint/hadolint < Dockerfile | tee -a dockerlinter.log"
	}
	post {
          always {
	    sh "docker rmi ${params.APPREPO}:node${env.BUILD_ID}"
	   }
        }
   }

   stage('Smoke Deploy')
    {
       agent { label 'kind' }
       steps {
           git branch: 'main', credentialsId: 'GitlabCred', url: 'https://gitlab.com/wezvaprojects/ninjas/jobready1.0/build/frontend/node-express.git'

           sh "kubectl create namespace wezvatechfb"
           withAWS(credentials:'AWSCred') {
	         sh "kubectl create secret docker-registry awsecr-cred  --docker-server=$ECRURL  --docker-username=AWS --docker-password=\$(/opt/awscli-venv/bin/aws ecr get-login-password --region=${params.REGION})  --namespace=wezvatechfb"
	        }

           echo "Deploying New Build ..."
           sh "sed -i 's/image:.[0-9][0-9].*/image: ${params.ECRURL}\\/${params.APPREPO}:node${env.BUILD_ID}/g' deployfrontend.yml"
           sh "kubectl apply -f deployfrontend.yml"
       }
    }

   stage('Smoke Test')
    {
       agent { label 'kind' }
       steps {
              sh "kubectl wait --for=condition=ready pod/`kubectl get pods -n wezvatechfb |grep wezva |awk '{print \$1}'| tail -1` -n wezvatechfb  --timeout=30s"
              sh  "echo Nodejs deployed successfully ..."
	      sh "kubectl delete ns wezvatechfb"
       }
     }


 }
}