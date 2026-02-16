package org.example.backend.post.repository;

import org.example.backend.post.entity.PostMediaAsset;
import org.example.backend.post.entity.PostMediaAssetType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PostMediaAssetRepository extends JpaRepository<PostMediaAsset, Long> {

    List<PostMediaAsset> findAllByPostTypeAndPostIdOrderById(PostMediaAssetType postType, Long postId);

    void deleteAllByPostTypeAndPostId(PostMediaAssetType postType, Long postId);
}
