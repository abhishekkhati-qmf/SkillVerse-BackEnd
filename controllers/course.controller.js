import { Course } from "../models/course.model.js";
import { Lecture } from "../models/lecture.model.js";
import {
  deleteMediaFromCloudinary,
  deleteVideoFromCloudinary,
  uploadMedia,
} from "../utils/cloudinary.js";
export const createCourse = async (req, res) => {
  try {
    const { courseTitle, category } = req.body;
    if (!courseTitle || !category) {
      return res.status(400).json({
        // 400 bad request
        success: false,
        message: "Course title and category are required,",
      });
    }
    const course = await Course.create({
      courseTitle,
      category,
      creator: req.id,
    });

    return res.status(201).json({
      // 201 created status code
      course,
      message: "Course created successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to create course",
    });
  }
};

export const searchCourse = async (req,res) => {
     try{
         const {query="",categories=[],sortByPrice=""} =req.query;

         //create search query

         const  searchCriteria = {
           isPublished:true,
           $or:[
            {courseTitle:{$regex:query,$options:"i"}},
            {subTitle:{$regex:query,$options:"i"}},
            {category:{$regex:query,$options:"i"}},
           ]
         }

         //if categories selected 
         if(categories.length>0){
          searchCriteria.category = {$in:categories}
         }

         //define sorting order
         const sortOptions = {};
         if(sortByPrice === "low"){
           sortOptions.coursePrice = 1; //sort by price in ascending 
         }
         else if(sortByPrice==="high"){
           sortOptions.coursePrice = -1; //sort by price in descending
         }

         let courses = await Course.find(searchCriteria).populate({path:"creator",select:"name photoUrl"}).sort(sortOptions);  

         return res.status(200).json({
          success:true,
          courses:courses || []
         })
     }
     catch(error){
       console.log(error);
       res.status(500).json({ success: false, message: "Server Error" });
     }
}

export const getPublishedCourse = async(_,res) => {
    try{
         const courses = await Course.find({isPublished:true}).populate({path:"creator",select:"name photoUrl"});

         if(!courses){
          return res.status(404).json({
           message:"Courses not found",
         })
        }
        return res.status(200).json({
          courses,
        })
    }catch(error){
       console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to get published courses",
    });
    }
}
export const getCreatorCourses = async (req, res) => {
  try {
    const userId = req.id;
    const courses = await Course.find({ creator: userId });
    if (!courses) {
      return res.status(404).json({
        courses: [],
        message: "Course Not found",
      });
    }
    return res.status(200).json({
      courses,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to get course",
    });
  }
};

export const editCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId;
    const {
      courseTitle,
      subTitle,
      category,
      description,
      courseLevel,
      coursePrice,
    } = req.body;

    const thumbnail = req.file;

    let course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        //404 doesn't exist
        message: "Course not found!",
      });
    }

    let courseThumbnail;
    if (thumbnail) {
      if (course.courseThumbnail) {
        const publicId = course.courseThumbnail.split("/").pop().split(".")[0]; //extract public id
        await deleteMediaFromCloudinary(publicId); //delete old image
      }

      //upload a thumbnail on cloudinary
      courseThumbnail = await uploadMedia(thumbnail.path);
    }
    const updateData = {
      courseTitle,
      subTitle,
      category,
      description,
      courseLevel,
      coursePrice,
      courseThumbnail: courseThumbnail?.secure_url,
    };

    course = await Course.findByIdAndUpdate(courseId, updateData, {
      new: true,
    });

    return res.status(200).json({
      course,
      message: "Course updated successfully.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to create course",
    });
  }
};

export const removeCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findByIdAndDelete(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found!",
      });
    }
    return res.status(200).json({
      message: "Course removed successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to remove course",
    });
  }
};
export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        //404 doesn't exist
        message: "Course not found!",
      });
    }

    return res.status(200).json({
      course,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to get course by id",
    });
  }
};

export const createLecture = async (req, res) => {
  try {
    const { lectureTitle } = req.body;
    const { courseId } = req.params;

    if (!lectureTitle || !courseId) {
      return res.status(400).json({
        // 400 bad request
        success: false,
        message: "Lecture title is required,",
      });
    }

    //create lecture

    const lecture = await Lecture.create({
      lectureTitle,
    });

    //add lecture to course
    const course = await Course.findById(courseId);
    if (course) {
      course.lectures.push(lecture._id);
      await course.save();
    }

    return res.status(201).json({
      // 201 created status code
      lecture,
      message: "Lecture created successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to create lecture",
    });
  }
};

export const getCourseLecture = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId).populate("lectures");

    if (!course) {
      return res.status(404).json({
        //404 doesn't exist
        message: "Course not found!",
      });
    }

    return res.status(200).json({
      lectures: course.lectures,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to get course",
    });
  }
};

export const editLecture = async (req, res) => {
  try {
    const { courseId, lectureId } = req.params;

    const { lectureTitle, videoInfo, isPreviewFree } = req.body;

    const lecture = await Lecture.findById(lectureId);

    if (!lecture) {
      return res.status(404).json({
        //doesn't exist
        message: "Lecture not found!",
      });
    }

    //update Lecture

    if (lectureTitle) lecture.lectureTitle = lectureTitle;
    if (videoInfo?.videoUrl) lecture.videoUrl = videoInfo.videoUrl;
    if (videoInfo?.publicId) lecture.publicId = videoInfo.publicId;
    lecture.isPreviewFree = isPreviewFree;

    await lecture.save();

    // Ensuer the course still has the lecture id if it was not already added;
    const course = await Course.findById(courseId);

    if (course && !course.lectures.includes(lecture._id)) {
      course.lectures.push(lecture._id);
      await course.save();
    }
    return res.status(200).json({
      lecture,
      message: "Lecture updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to edit course",
    });
  }
};

export const removeLecture = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findByIdAndDelete(lectureId);

    if (!lecture) {
      return res.status(404).json({
        message: "Lecture not found!",
      });
    }
    //delete the lecture from cloudinary as well
    if (lecture.publicId) {
      await deleteVideoFromCloudinary(lecture.publicId);
    }

    //Remove the lecture reference from the associated course;
    await Course.updateOne(
      { lectures: lectureId }, //find the course that contains the lecture
      { $pull: { lectures: lectureId } } // Remove the lecture id from the lectures array
    );

    return res.status(200).json({
      message: "Lecture removed successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to remove lecture",
    });
  }
};

export const getLectureById = async (req, res) => {
  try {
    const { lectureId } = req.params;
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({
        //404 doesn't exist
        message: "Lecture not found!",
      });
    }
    return res.status(200).json({
      lecture,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to get lecture by id",
    });
  }
};

//publish Unpublish course logic

export const togglePublishCourse = async (req, res) => {
  try {
   const {courseId} = req.params;
   const {publish}=req.query;  //true,false
   const course = await Course.findById(courseId);
   if(!course){
       return res.status(400).json({
           message:"Course not found!"
       });
   }
   //publish status based on the query parameter 
   course.isPublished = publish==="true";
   await course.save();

   const statusMessage = course.isPublished ? "Published" : "Unpublished";
   return res.status(200).json({
    message:`Course is ${statusMessage}`
   })
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      // 500 internal server error
      success: false,
      message: "Failed to update status",
    });
  }
};
