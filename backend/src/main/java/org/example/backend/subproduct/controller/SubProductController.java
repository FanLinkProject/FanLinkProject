package org.example.backend.subproduct.controller;

import lombok.RequiredArgsConstructor;
import org.example.backend.subproduct.dto.SubProductRequest;
import org.example.backend.subproduct.entity.SubProduct;
import org.example.backend.subproduct.service.SubProductService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/sub-products")
@RequiredArgsConstructor
public class SubProductController {

    private final SubProductService subProductService;

    @GetMapping
    public List<SubProduct> findAll() {
        return subProductService.findAll();
    }

    @GetMapping("/{id}")
    public SubProduct findById(@PathVariable Long id) {
        return subProductService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "SubProduct not found: " + id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SubProduct create(@RequestBody SubProductRequest req) {
        return subProductService.create(req);
    }

    @PutMapping("/{id}")
    public SubProduct update(@PathVariable Long id, @RequestBody SubProductRequest req) {
        return subProductService.update(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        subProductService.deleteById(id);
    }
}
